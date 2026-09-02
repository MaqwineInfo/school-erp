/**
 * Enrolment service — the single place a student is attached to an academic group.
 *
 * ADR-04. Every rule that used to live scattered across `student.controller` and
 * `academic.service` (capacity checks, section normalisation, promotion) lives here, runs
 * inside a transaction, and maintains the history the old design destroyed.
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const { repo } = require('../../infra/repository/BaseRepository');
const { publish } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const { BusinessRuleError, NotFoundError, ConflictError } = require('../../shared/errors');

const groups = () => repo(mongoose.model('AcademicGroup'));
const enrolments = () => repo(mongoose.model('Enrolment'));
const students = () => repo(mongoose.model('Student'));

/**
 * Recompute a group's strength from its active enrolments.
 * Derived, never incremented by hand — the old `syncDivisionStrength` drifted whenever a
 * student was deleted outside the one code path that called it.
 */
async function syncStrength(scope, academicGroupId, session) {
  const Enrolment = mongoose.model('Enrolment');
  const AcademicGroup = mongoose.model('AcademicGroup');

  const strength = await Enrolment.countDocuments({
    academicGroupId,
    status: 'active',
    deletedAt: null,
  }).session(session ?? null);

  await AcademicGroup.updateOne({ _id: academicGroupId }, { $set: { strength } }, { session });
  return strength;
}

/**
 * Enrol a student into a group.
 *
 * Capacity is checked INSIDE the transaction and re-verified after the write, so two
 * concurrent admissions cannot both take the last seat — the acceptance criterion
 * "no double-allocation of capacity even under concurrent payments" (Plan.docx §10).
 */
async function enrol(scope, { studentId, academicGroupId, rollNo, joinedAt, isProrated }, opts = {}) {
  return uow.run(async (session) => {
    const AcademicGroup = mongoose.model('AcademicGroup');
    const Enrolment = mongoose.model('Enrolment');

    const group = await groups().findById(scope, academicGroupId, { session });
    if (!group) throw new NotFoundError('Academic group not found');
    if (!group.isActive) throw new BusinessRuleError('That class/batch is not active');

    const student = await students().findById(scope, studentId, { session });
    if (!student) throw new NotFoundError('Student not found');

    // Single-active invariant (D9).
    const existing = await Enrolment.findOne({
      tenantId: scope.tenantId,
      studentId,
      status: 'active',
      deletedAt: null,
    }).session(session);

    if (existing) {
      if (String(existing.academicGroupId) === String(academicGroupId)) {
        return existing; // idempotent re-enrol into the same group
      }
      throw new ConflictError(
        'This student already has an active enrolment. Transfer or complete it first.',
      );
    }

    if (group.capacity > 0 && group.strength >= group.capacity) {
      throw new BusinessRuleError(
        `${group.displayName || group.name} is full (${group.capacity} seats)`,
        { academicGroupId, capacity: group.capacity, strength: group.strength },
      );
    }

    const [created] = await Enrolment.create(
      [
        {
          tenantId: scope.tenantId,
          branchId: group.branchId,
          academicYearId: group.academicYearId,
          studentId,
          academicGroupId,
          // Dual-write the legacy pair during the migration window.
          standardId: group.standardId ?? null,
          divisionName: group.kind === 'section' ? group.name : null,
          rollNo: rollNo ?? null,
          status: 'active',
          joinedAt: joinedAt ?? new Date(),
          isProrated: !!isProrated,
        },
      ],
      { session },
    );

    const strength = await syncStrength(scope, academicGroupId, session);

    // Re-verify after the write: if a concurrent transaction also took a seat, the count
    // now exceeds capacity and this one must roll back.
    if (group.capacity > 0 && strength > group.capacity) {
      throw new BusinessRuleError(
        `${group.displayName || group.name} filled up while this admission was being processed`,
      );
    }

    // Keep the denormalised fields on Student in step during the dual-write window.
    await mongoose.model('Student').updateOne(
      { _id: studentId },
      {
        $set: {
          academicGroupId,
          standardId: group.standardId ?? null,
          divisionName: group.kind === 'section' ? group.name : null,
          academicYearId: group.academicYearId,
          branchId: group.branchId,
        },
      },
      { session },
    );

    await publish(
      EVENTS.STUDENT_ENROLLED,
      {
        tenantId: scope.tenantId,
        branchId: group.branchId,
        studentId: String(studentId),
        academicGroupId: String(academicGroupId),
        enrolmentId: String(created._id),
        academicYearId: String(group.academicYearId),
      },
      { session, req: opts.req },
    );

    return created;
  }, opts);
}

/** Close an enrolment without opening a new one (withdrawal, transfer out). */
async function close(scope, { studentId, status = 'withdrawn', leftAt, remarks }, opts = {}) {
  return uow.run(async (session) => {
    const Enrolment = mongoose.model('Enrolment');

    const current = await Enrolment.findOne({
      tenantId: scope.tenantId,
      studentId,
      status: 'active',
      deletedAt: null,
    }).session(session);

    if (!current) throw new NotFoundError('No active enrolment for this student');

    current.status = status;
    current.leftAt = leftAt ?? new Date();
    if (remarks) current.remarks = remarks;
    await current.save({ session });

    await syncStrength(scope, current.academicGroupId, session);
    return current;
  }, opts);
}

/**
 * Move a student to a new group, preserving the previous enrolment as history.
 * Used by promotion, section change, batch change and branch transfer.
 */
async function transfer(scope, { studentId, toGroupId, reason = 'promoted', rollNo }, opts = {}) {
  return uow.run(async (session) => {
    const Enrolment = mongoose.model('Enrolment');

    const current = await Enrolment.findOne({
      tenantId: scope.tenantId,
      studentId,
      status: 'active',
      deletedAt: null,
    }).session(session);

    const target = await groups().findById(scope, toGroupId, { session });
    if (!target) throw new NotFoundError('Target class/batch not found');

    if (current && String(current.academicGroupId) === String(toGroupId)) {
      return current; // already there — idempotent
    }

    if (target.capacity > 0 && target.strength >= target.capacity) {
      throw new BusinessRuleError(`${target.displayName || target.name} is full`);
    }

    let previousId = null;
    if (current) {
      current.status = reason === 'promoted' ? 'promoted' : 'transferred';
      current.leftAt = new Date();
      await current.save({ session });
      previousId = current._id;
      await syncStrength(scope, current.academicGroupId, session);
    }

    const [created] = await Enrolment.create(
      [
        {
          tenantId: scope.tenantId,
          branchId: target.branchId,
          academicYearId: target.academicYearId,
          studentId,
          academicGroupId: toGroupId,
          standardId: target.standardId ?? null,
          divisionName: target.kind === 'section' ? target.name : null,
          rollNo: rollNo ?? current?.rollNo ?? null,
          status: 'active',
          joinedAt: new Date(),
          previousEnrolmentId: previousId,
        },
      ],
      { session },
    );

    const strength = await syncStrength(scope, toGroupId, session);
    if (target.capacity > 0 && strength > target.capacity) {
      throw new BusinessRuleError(`${target.displayName || target.name} filled up during the transfer`);
    }

    await mongoose.model('Student').updateOne(
      { _id: studentId },
      {
        $set: {
          academicGroupId: toGroupId,
          standardId: target.standardId ?? null,
          divisionName: target.kind === 'section' ? target.name : null,
          academicYearId: target.academicYearId,
          branchId: target.branchId,
        },
      },
      { session },
    );

    if (reason === 'promoted') {
      await publish(
        EVENTS.STUDENT_PROMOTED,
        {
          tenantId: scope.tenantId,
          studentId: String(studentId),
          fromGroupId: current ? String(current.academicGroupId) : null,
          toGroupId: String(toGroupId),
        },
        { session, req: opts.req },
      );
    }

    return created;
  }, opts);
}

/**
 * Bulk promotion at year end.
 * Runs one transaction per student rather than one for the whole cohort: a single failing
 * student (capacity, detention) must not roll back an entire class of 40.
 */
async function promoteMany(scope, { studentIds, toGroupId, detainedIds = [] }, opts = {}) {
  const detained = new Set(detainedIds.map(String));
  const result = { promoted: [], detained: [], failed: [] };

  for (const studentId of studentIds) {
    if (detained.has(String(studentId))) {
      result.detained.push(String(studentId));
      continue;
    }
    try {
      await transfer(scope, { studentId, toGroupId, reason: 'promoted' }, opts);
      result.promoted.push(String(studentId));
    } catch (err) {
      result.failed.push({ studentId: String(studentId), error: err.message });
    }
  }

  return result;
}

/** The student's current enrolment, or null. */
function current(scope, studentId) {
  return enrolments().findOne(scope, { studentId, status: 'active' }, {
    populate: { path: 'academicGroupId', select: 'name displayName kind standardId courseId' },
  });
}

/** Full enrolment history, newest first — the answer to "who was in 8-A in 2025-26?". */
function history(scope, studentId) {
  return enrolments().find(scope, { studentId }, {
    sort: { joinedAt: -1 },
    populate: [
      { path: 'academicGroupId', select: 'name displayName kind' },
      { path: 'academicYearId', select: 'name' },
    ],
  });
}

/** Active student ids in a group — used by attendance, marks and fee generation. */
async function studentIdsInGroup(scope, academicGroupId) {
  const rows = await enrolments().find(
    scope,
    { academicGroupId, status: 'active' },
    { select: 'studentId', lean: true },
  );
  return rows.map((r) => r.studentId);
}

module.exports = {
  enrol,
  close,
  transfer,
  promoteMany,
  current,
  history,
  studentIdsInGroup,
  syncStrength,
};
