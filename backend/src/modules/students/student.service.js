/**
 * Student service.
 *
 * Phase 4. Everything goes through `repo(Student)` with `req.scope`, which is what makes
 * data scoping real: the legacy controller built its own `{ tenantId }` filter, so a
 * Main-branch principal saw North-branch students, a class teacher saw the whole school
 * and a parent could fetch any child by id.
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const sequence = require('../../platform/sequence/sequence');
const { repo } = require('../../infra/repository/BaseRepository');
const { record } = require('../../platform/audit/auditLogger');
const { blindIndex } = require('../../platform/crypto/secrets');
const { BusinessRuleError, NotFoundError, ConflictError } = require('../../shared/errors');

const students = () => repo(mongoose.model('Student'));
const documents = () => repo(mongoose.model('StudentDocument'));
const timeline = () => repo(mongoose.model('StudentTimelineEvent'));

// ── Reads ────────────────────────────────────────────────────────────────────

async function list(scope, { page = 1, limit = 20, search, status = 'active', academicGroupId, standardId, divisionName } = {}) {
  const criteria = {};
  if (status) criteria.status = status;
  if (academicGroupId) criteria.academicGroupId = academicGroupId;
  if (standardId) criteria.standardId = standardId;
  if (divisionName) criteria.divisionName = String(divisionName).trim().toUpperCase();

  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    criteria.$or = [{ name: rx }, { admissionNo: rx }, { rollNo: rx }];
  }

  return students().paginate(scope, criteria, {
    page,
    limit,
    sort: { name: 1 },
    populate: [
      { path: 'standardId', select: 'name shortName' },
      { path: 'academicGroupId', select: 'name displayName kind' },
    ],
  });
}

function getById(scope, id) {
  return students().findByIdOrFail(scope, id, {
    populate: [
      { path: 'standardId', select: 'name shortName' },
      { path: 'academicGroupId', select: 'name displayName kind inchargeId' },
      { path: 'academicYearId', select: 'name' },
    ],
  });
}

/**
 * The 360° profile (specification §5.1 / wireframe WF-0083).
 *
 * Composed from other modules' PUBLIC interfaces — this module never touches a fee or
 * attendance model directly (architecture §9). A module that is not installed simply
 * contributes nothing rather than breaking the page.
 */
async function profile360(scope, studentId) {
  const student = await getById(scope, studentId);

  const safe = async (fn, fallback) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const academics = require('../academics');
  const fees = require('../fees');
  const attendance = require('../attendance');

  const [enrolment, history, outstanding, docs, events] = await Promise.all([
    safe(() => academics.service.currentEnrolment(scope, studentId), null),
    safe(() => academics.service.enrolmentHistory(scope, studentId), []),
    safe(() => fees.service.outstandingForStudent(scope, studentId), { amount: 0, demandCount: 0 }),
    safe(() => documents().find(scope, { studentId }, { sort: { createdAt: -1 }, lean: true }), []),
    safe(
      () => timeline().find(scope, { studentId }, { sort: { occurredAt: -1 }, limit: 25, lean: true }),
      [],
    ),
  ]);

  // Attendance needs a date window; last 90 days is the useful default for a profile.
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const attendanceSummary = await safe(
    () => attendance.service.studentSummary(scope, { studentId, from, to: new Date() }),
    null,
  );

  return {
    student,
    enrolment,
    enrolmentHistory: history,
    fees: outstanding,
    attendance: attendanceSummary,
    documents: docs,
    timeline: events,
  };
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** Next admission number for the branch, from the atomic sequence. */
async function nextAdmissionNo(scope, branchId, session) {
  const { number } = await sequence.nextFormatted({
    tenantId: scope.tenantId,
    branchId,
    kind: 'admission',
    prefix: 'ADM',
    session,
  });
  return number;
}

/**
 * Create a student, optionally enrolling them into a class in the same transaction.
 *
 * Aadhaar (ADR-13): the raw number is used to compute a blind index and the last four
 * digits, then discarded. There is no field to store it in.
 */
async function create(scope, input, opts = {}) {
  return uow.run(async (session) => {
    const Student = mongoose.model('Student');

    const branchId = scope.branchIds !== 'ALL' ? scope.branchIds[0] : input.branchId;
    if (!branchId) throw new BusinessRuleError('A branch is required to admit a student');

    const admissionNo = input.admissionNo || (await nextAdmissionNo(scope, branchId, session));

    const clash = await Student.findOne({
      tenantId: scope.tenantId,
      admissionNo,
      deletedAt: null,
    }).session(session);
    if (clash) throw new ConflictError(`Admission number ${admissionNo} is already in use`);

    const doc = { ...input, admissionNo };

    /**
     * Stamp the active academic year when the caller does not supply one.
     * Student is year-scoped (`temporalScope: 'current_ay'`), so a record created without
     * a year is invisible to the very user who just created it — including to the
     * enrolment call that immediately follows.
     */
    if (!doc.academicYearId) {
      const academics = require('../academics');
      const year = await academics.service.activeYear(scope);
      if (year) doc.academicYearId = year._id;
    }

    if (input.aadhaar) {
      doc.aadhaarHash = blindIndex(input.aadhaar);
      doc.aadhaarLast4 = String(input.aadhaar).slice(-4);
      delete doc.aadhaar;

      const duplicate = await Student.findOne({
        tenantId: scope.tenantId,
        aadhaarHash: doc.aadhaarHash,
        deletedAt: null,
      }).session(session);
      if (duplicate) {
        throw new ConflictError('A student with this Aadhaar is already enrolled');
      }
    }

    const created = await students().create(scope, doc, { session });

    await mongoose.model('StudentTimelineEvent').create(
      [
        {
          tenantId: scope.tenantId,
          branchId: created.branchId,
          studentId: created._id,
          type: 'admitted',
          title: 'Admitted',
          description: `Admission number ${created.admissionNo}`,
          recordedBy: scope.userId,
        },
      ],
      { session },
    );

    return created;
  }, opts);
}

async function update(scope, id, patch, opts = {}) {
  const before = await students().findByIdOrFail(scope, id, { lean: true });

  const doc = { ...patch };
  // Identity fields are not editable through the general update path.
  delete doc.admissionNo;
  delete doc.aadhaarHash;
  delete doc.aadhaarLast4;
  delete doc.status;

  if (doc.aadhaar) {
    doc.aadhaarHash = blindIndex(doc.aadhaar);
    doc.aadhaarLast4 = String(doc.aadhaar).slice(-4);
    delete doc.aadhaar;
  }

  const after = await students().updateByIdOrFail(scope, id, { $set: doc });

  record({
    req: opts.req,
    module: 'students',
    action: 'edit',
    resourceType: 'Student',
    resourceId: after._id,
    before,
    after: after.toObject(),
  });

  return after;
}

/**
 * Withdraw a student. Soft delete only — specification §11 keeps a read-only profile for
 * seven years, and a hard delete is a DPDP erasure action reserved for the platform admin.
 */
async function withdraw(scope, id, { reason, status = 'withdrawn' } = {}, opts = {}) {
  return uow.run(async (session) => {
    const before = await students().findByIdOrFail(scope, id, { session });

    const academics = require('../academics');
    await academics.service
      .closeEnrolment(scope, { studentId: id, status: 'withdrawn', remarks: reason }, { session })
      .catch(() => {
        /* no active enrolment — withdrawal is still valid */
      });

    before.status = status;
    await before.save({ session });

    await mongoose.model('StudentTimelineEvent').create(
      [
        {
          tenantId: scope.tenantId,
          branchId: before.branchId,
          studentId: before._id,
          type: 'withdrawn',
          title: 'Withdrawn',
          description: reason,
          recordedBy: scope.userId,
        },
      ],
      { session },
    );

    record({
      req: opts.req,
      module: 'students',
      action: 'withdraw',
      resourceType: 'Student',
      resourceId: before._id,
      reason,
    });

    return before;
  }, opts);
}

/**
 * Bulk import. Validates every row first and imports nothing if any row is bad —
 * "CSV imports validate row-by-row; the entire batch is transactional" (Plan.docx §9).
 */
async function bulkImport(scope, rows, opts = {}) {
  const Student = mongoose.model('Student');
  const problems = [];
  const seen = new Set();

  rows.forEach((row, i) => {
    if (!row.name) problems.push({ row: i + 1, error: 'Name is required' });
    if (row.admissionNo) {
      if (seen.has(row.admissionNo)) {
        problems.push({ row: i + 1, error: `Duplicate admission number ${row.admissionNo} in this file` });
      }
      seen.add(row.admissionNo);
    }
  });

  if (seen.size) {
    const existing = await Student.find({
      tenantId: scope.tenantId,
      admissionNo: { $in: [...seen] },
      deletedAt: null,
    })
      .select('admissionNo')
      .lean();

    existing.forEach((e) => {
      problems.push({ error: `Admission number ${e.admissionNo} already exists` });
    });
  }

  if (problems.length) {
    throw new BusinessRuleError(`${problems.length} row(s) could not be imported`, problems);
  }

  return uow.run(async (session) => {
    const created = [];
    for (const row of rows) {
      created.push(await create(scope, row, { session }));
    }
    return { imported: created.length, students: created };
  }, opts);
}

// ── Documents & timeline ─────────────────────────────────────────────────────

async function addDocument(scope, studentId, doc) {
  await students().findByIdOrFail(scope, studentId); // scope check
  return documents().create(scope, { ...doc, studentId, uploadedBy: scope.userId });
}

async function verifyDocument(scope, documentId, { verified, rejectionReason }) {
  return documents().updateByIdOrFail(scope, documentId, {
    $set: {
      verified,
      verifiedBy: scope.userId,
      verifiedAt: new Date(),
      rejectionReason: verified ? null : rejectionReason,
    },
  });
}

async function addTimelineEvent(scope, studentId, event) {
  await students().findByIdOrFail(scope, studentId);
  return timeline().create(scope, { ...event, studentId, recordedBy: scope.userId });
}

/**
 * Unmask Aadhaar. RBAC §6.1 makes this a Compliance-Officer-only action that is audited
 * per view. There is deliberately no stored plaintext to return — the design keeps only a
 * blind index and the last four digits, so this reports what is knowable and logs the
 * attempt.
 */
async function revealAadhaar(scope, studentId, { reason }, opts = {}) {
  const student = await students().findByIdOrFail(scope, studentId, { select: '+aadhaarHash' });

  record({
    req: opts.req,
    module: 'students',
    action: 'aadhaar_unmask',
    resourceType: 'Student',
    resourceId: student._id,
    reason,
    tags: ['pii', 'dpdp'],
  });

  return {
    masked: student.maskedAadhaar(),
    last4: student.aadhaarLast4 ?? null,
    note: 'The full Aadhaar number is never stored (DPDP / UIDAI). Only a keyed index and the last four digits are retained.',
  };
}

module.exports = {
  list,
  getById,
  profile360,
  create,
  update,
  withdraw,
  bulkImport,
  addDocument,
  verifyDocument,
  addTimelineEvent,
  revealAadhaar,
  nextAdmissionNo,
  repos: { students, documents, timeline },
};
