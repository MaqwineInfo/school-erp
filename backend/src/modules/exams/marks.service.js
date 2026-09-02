/**
 * Marks entry, verification, locking and correction.
 *
 * Closes defect A6. The rules enforced here — all of which the previous implementation
 * lacked entirely:
 *   - marks may not exceed the maximum, and may not be negative
 *   - a verified or locked entry cannot be silently overwritten
 *   - every change to a non-draft mark records old value, new value, actor and reason
 *   - a post-lock correction requires the RBAC §5.4 workflow and a time-boxed window
 *   - results cannot publish until every enrolled student has a mark in every subject
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const { repo } = require('../../infra/repository/BaseRepository');
const { publish } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const { record } = require('../../platform/audit/auditLogger');
const {
  BusinessRuleError,
  NotFoundError,
  ForbiddenError,
} = require('../../shared/errors');

const marks = () => repo(mongoose.model('MarksEntry'));
const exams = () => repo(mongoose.model('Exam'));
const schemes = () => repo(mongoose.model('GradeScheme'));

// ── Grading ──────────────────────────────────────────────────────────────────

/** The tenant's default scheme, seeded to CBSE if none exists. */
async function defaultScheme(scope) {
  const GradeScheme = mongoose.model('GradeScheme');

  let scheme = await GradeScheme.findOne({
    tenantId: scope.tenantId,
    isDefault: true,
    deletedAt: null,
  });

  if (!scheme) {
    scheme = await GradeScheme.create({
      tenantId: scope.tenantId,
      name: 'CBSE Default',
      board: 'CBSE',
      bands: GradeScheme.CBSE_BANDS,
      passPercent: 33,
      isDefault: true,
    });
  }

  return scheme;
}

function gradeFor(scheme, marksObtained, maxMarks, isAbsent) {
  if (isAbsent) return { grade: scheme.absentGrade || 'AB', gradePoint: 0 };
  if (marksObtained == null) return { grade: null, gradePoint: null };

  const percent = (marksObtained / maxMarks) * 100;
  const band = scheme.bands.find((b) => percent >= b.minPercent && percent <= b.maxPercent);
  return { grade: band?.grade ?? null, gradePoint: band?.gradePoint ?? null };
}

// ── Entry ────────────────────────────────────────────────────────────────────

/**
 * Save marks for one exam, subject and group.
 *
 * Rejects the whole batch if ANY entry is invalid, so a teacher never ends up with half
 * a class saved. Locked entries are refused explicitly rather than overwritten.
 */
async function saveMarks(scope, { examId, subjectId, academicGroupId, entries }, opts = {}) {
  return uow.run(async (session) => {
    const MarksEntry = mongoose.model('MarksEntry');
    const Subject = mongoose.model('Subject');

    const exam = await exams().findByIdOrFail(scope, examId, { session });
    if (['published', 'locked'].includes(exam.status)) {
      throw new BusinessRuleError(
        `This exam is ${exam.status}; marks can only be changed through a correction request`,
      );
    }

    const subject = await Subject.findById(subjectId).select('name maxMarks passMarks').lean();
    if (!subject) throw new NotFoundError('Subject not found');

    const academics = require('../academics');
    const allowedStudentIds = (await academics.service.studentIdsInGroup(scope, academicGroupId)).map(String);

    const scheme = await defaultScheme(scope);

    // ── Validate the whole batch BEFORE writing anything ───────────────────
    const problems = [];

    for (const entry of entries) {
      const max = entry.maxMarks ?? subject.maxMarks ?? 100;

      if (!allowedStudentIds.includes(String(entry.studentId))) {
        problems.push({ studentId: entry.studentId, error: 'Student is not enrolled in this class' });
        continue;
      }
      if (!entry.isAbsent) {
        if (entry.marksObtained == null) {
          problems.push({ studentId: entry.studentId, error: 'Marks are required unless the student is absent' });
        } else if (entry.marksObtained < 0) {
          problems.push({ studentId: entry.studentId, error: 'Marks cannot be negative' });
        } else if (entry.marksObtained > max) {
          // The check the old code never made.
          problems.push({
            studentId: entry.studentId,
            error: `Marks ${entry.marksObtained} exceed the maximum of ${max}`,
          });
        }
      }
    }

    if (problems.length) {
      // Lead with the first specific problem — "Some marks could not be saved" alone
      // tells a teacher nothing. The full list stays in `details`.
      const summary =
        problems.length === 1
          ? problems[0].error
          : `${problems[0].error} (and ${problems.length - 1} other problem(s))`;
      throw new BusinessRuleError(summary, problems);
    }

    // ── Refuse to overwrite anything already finalised ─────────────────────
    const existing = await MarksEntry.find({
      tenantId: scope.tenantId,
      examId,
      subjectId,
      studentId: { $in: entries.map((e) => e.studentId) },
    }).session(session);

    const byStudent = new Map(existing.map((e) => [String(e.studentId), e]));
    const locked = existing.filter((e) => !e.isEditable());

    if (locked.length) {
      throw new BusinessRuleError(
        `${locked.length} mark(s) are verified or locked and cannot be edited directly. ` +
          'Raise a mark-correction request instead.',
        locked.map((e) => ({ studentId: String(e.studentId), lockState: e.lockState })),
      );
    }

    // ── Write ──────────────────────────────────────────────────────────────
    const saved = [];

    for (const entry of entries) {
      const max = entry.maxMarks ?? subject.maxMarks ?? 100;
      const { grade, gradePoint } = gradeFor(scheme, entry.marksObtained, max, entry.isAbsent);
      const current = byStudent.get(String(entry.studentId));

      if (current) {
        // Record the revision when a non-draft value actually changes.
        if (current.lockState !== 'draft' && current.marksObtained !== entry.marksObtained) {
          current.revisions.push({
            from: current.marksObtained,
            to: entry.marksObtained,
            reason: entry.reason ?? 'Corrected during entry',
            changedBy: scope.userId,
            at: new Date(),
          });
        }
        Object.assign(current, {
          marksObtained: entry.isAbsent ? null : entry.marksObtained,
          maxMarks: max,
          passMarks: subject.passMarks ?? 33,
          grade,
          gradePoint,
          isAbsent: !!entry.isAbsent,
          remarks: entry.remarks ?? current.remarks,
          enteredBy: scope.userId,
          lockState: 'submitted',
        });
        await current.save({ session });
        saved.push(current);
      } else {
        const [created] = await MarksEntry.create(
          [
            {
              tenantId: scope.tenantId,
              branchId: scope.branchIds !== 'ALL' ? scope.branchIds[0] : undefined,
              examId,
              subjectId,
              academicGroupId,
              studentId: entry.studentId,
              marksObtained: entry.isAbsent ? null : entry.marksObtained,
              maxMarks: max,
              passMarks: subject.passMarks ?? 33,
              grade,
              gradePoint,
              isAbsent: !!entry.isAbsent,
              remarks: entry.remarks,
              enteredBy: scope.userId,
              lockState: 'submitted',
            },
          ],
          { session },
        );
        saved.push(created);
      }
    }

    return saved;
  }, opts);
}

/** HoD verification — moves submitted entries to `verified`. */
async function verifyMarks(scope, { examId, subjectId, academicGroupId }, opts = {}) {
  const MarksEntry = mongoose.model('MarksEntry');

  const res = await MarksEntry.updateMany(
    {
      tenantId: scope.tenantId,
      examId,
      subjectId,
      ...(academicGroupId ? { academicGroupId } : {}),
      lockState: 'submitted',
    },
    { $set: { lockState: 'verified', verifiedBy: scope.userId } },
  );

  record({
    req: opts.req,
    module: 'examinations',
    action: 'verify_marks',
    resourceType: 'MarksEntry',
    after: { examId, subjectId, verified: res.modifiedCount },
  });

  return res.modifiedCount;
}

/** Exam coordinator locks the marks. After this only the workflow can change them. */
async function lockMarks(scope, { examId, subjectId }, opts = {}) {
  const MarksEntry = mongoose.model('MarksEntry');

  const res = await MarksEntry.updateMany(
    {
      tenantId: scope.tenantId,
      examId,
      ...(subjectId ? { subjectId } : {}),
      lockState: { $in: ['submitted', 'verified'] },
    },
    { $set: { lockState: 'locked', lockedBy: scope.userId, lockedAt: new Date() } },
  );

  await publish(EVENTS.MARKS_LOCKED, {
    tenantId: scope.tenantId,
    examId: String(examId),
    subjectId: subjectId ? String(subjectId) : null,
    count: res.modifiedCount,
  }, { req: opts.req });

  record({
    req: opts.req,
    module: 'examinations',
    action: 'lock_marks',
    resourceType: 'MarksEntry',
    after: { examId, subjectId, locked: res.modifiedCount },
  });

  return res.modifiedCount;
}

/**
 * Request a correction to a locked mark (RBAC §5.4).
 * Raises an approval request; the mark does not change until it is granted.
 */
async function requestCorrection(scope, { marksEntryId, newMarks, reason }, opts = {}) {
  const MarksEntry = mongoose.model('MarksEntry');

  const entry = await MarksEntry.findOne({ _id: marksEntryId, tenantId: scope.tenantId });
  if (!entry) throw new NotFoundError('Marks entry not found');
  if (entry.isEditable()) {
    throw new BusinessRuleError('This mark is still editable — change it directly instead');
  }
  if (newMarks > entry.maxMarks || newMarks < 0) {
    throw new BusinessRuleError(`Marks must be between 0 and ${entry.maxMarks}`);
  }

  const exam = await exams().findById(scope, entry.examId, { lean: true });
  const approvals = require('../approvals');

  const { request } = await approvals.service.submit(
    scope,
    {
      workflowKey: 'mark_correction',
      resourceType: 'MarksEntry',
      resourceId: entry._id,
      title: `Mark correction: ${entry.marksObtained} → ${newMarks}`,
      payload: {
        newMarks,
        oldMarks: entry.marksObtained,
        reason,
        isPublished: exam?.status === 'published' ? 1 : 0,
      },
      branchId: entry.branchId,
    },
    opts,
  );

  return request;
}

/**
 * Open a 24-hour correction window. Called by the approvals subscriber once the
 * mark-correction workflow completes.
 */
async function applyApprovedCorrection(scope, { marksEntryId, newMarks, reason, approvalRequestId }) {
  return uow.run(async (session) => {
    const MarksEntry = mongoose.model('MarksEntry');

    const entry = await MarksEntry.findOne({ _id: marksEntryId, tenantId: scope.tenantId }).session(session);
    if (!entry) throw new NotFoundError('Marks entry not found');

    const scheme = await defaultScheme(scope);
    const { grade, gradePoint } = gradeFor(scheme, newMarks, entry.maxMarks, false);

    entry.revisions.push({
      from: entry.marksObtained,
      to: newMarks,
      reason,
      changedBy: scope.userId,
      approvalRequestId,
      at: new Date(),
    });

    entry.marksObtained = newMarks;
    entry.grade = grade;
    entry.gradePoint = gradePoint;
    entry.lockState = 'unlocked';
    entry.unlockedBy = scope.userId;
    // RBAC §5.4: the window expires automatically after 24 hours.
    entry.unlockExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    await entry.save({ session });
    return entry;
  });
}

/** Re-lock entries whose correction window has expired. Scheduled job. */
async function relockExpired() {
  const MarksEntry = mongoose.model('MarksEntry');
  const res = await MarksEntry.updateMany(
    { lockState: 'unlocked', unlockExpiresAt: { $lt: new Date() } },
    { $set: { lockState: 'locked' }, $unset: { unlockExpiresAt: '' } },
  );
  return res.modifiedCount;
}

// ── Results ──────────────────────────────────────────────────────────────────

/**
 * Can this exam publish?
 * "Results cannot be published until every subject has marks for every enrolled student"
 * (Plan.docx §14).
 */
async function publishReadiness(scope, examId) {
  const MarksEntry = mongoose.model('MarksEntry');
  const exam = await exams().findByIdOrFail(scope, examId);

  const academics = require('../academics');
  const missing = [];

  for (const groupId of exam.academicGroupIds ?? []) {
    const studentIds = await academics.service.studentIdsInGroup(scope, groupId);

    for (const subjectId of exam.subjectIds ?? []) {
      const entered = await MarksEntry.countDocuments({
        tenantId: scope.tenantId,
        examId,
        subjectId,
        academicGroupId: groupId,
        studentId: { $in: studentIds },
      });
      if (entered < studentIds.length) {
        missing.push({
          academicGroupId: String(groupId),
          subjectId: String(subjectId),
          expected: studentIds.length,
          entered,
        });
      }
    }
  }

  return { ready: missing.length === 0, missing };
}

/** Publish results after the readiness check and Principal approval. */
async function publishResults(scope, examId, opts = {}) {
  const readiness = await publishReadiness(scope, examId);
  if (!readiness.ready) {
    throw new BusinessRuleError(
      'Results cannot be published while marks are missing',
      readiness.missing,
    );
  }

  return uow.run(async (session) => {
    const exam = await exams().findByIdOrFail(scope, examId, { session });
    if (exam.status === 'published') return exam;

    exam.status = 'published';
    exam.publishedAt = new Date();
    exam.publishedBy = scope.userId;
    await exam.save({ session });

    await lockMarks(scope, { examId }, opts);

    await publish(
      EVENTS.RESULT_PUBLISHED,
      { tenantId: scope.tenantId, examId: String(examId), examName: exam.name },
      { session, req: opts.req },
    );

    return exam;
  }, opts);
}

/** Report card for one student in one exam. */
async function reportCard(scope, { studentId, examId }) {
  const Student = mongoose.model('Student');
  const MarksEntry = mongoose.model('MarksEntry');

  const exam = await exams().findById(scope, examId, { lean: true });
  if (!exam) throw new NotFoundError('Exam not found'); // the null check the old code lacked

  const student = await repo(Student).findById(scope, studentId, { lean: true });
  if (!student) throw new NotFoundError('Student not found');

  const entries = await marks().find(
    scope,
    { studentId, examId },
    { populate: { path: 'subjectId', select: 'name code type' }, lean: true },
  );

  const scored = entries.filter((e) => !e.isAbsent && e.marksObtained != null);
  const totalMarks = scored.reduce((s, e) => s + e.marksObtained, 0);
  const maxMarks = entries.reduce((s, e) => s + e.maxMarks, 0);
  const percentage = maxMarks > 0 ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;

  const scheme = await defaultScheme(scope);
  const { grade } = gradeFor(scheme, totalMarks, maxMarks || 1, false);
  const passed = entries.every(
    (e) => e.isAbsent || (e.marksObtained != null && (e.marksObtained / e.maxMarks) * 100 >= (e.passMarks ?? 33)),
  );

  // Rank within the same academic group only — ranking across the whole school was wrong.
  const groupId = entries[0]?.academicGroupId ?? student.academicGroupId;
  let rank = null;

  if (groupId) {
    const totals = await MarksEntry.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(String(scope.tenantId)),
          examId: new mongoose.Types.ObjectId(String(examId)),
          academicGroupId: new mongoose.Types.ObjectId(String(groupId)),
        },
      },
      { $group: { _id: '$studentId', total: { $sum: '$marksObtained' } } },
      { $sort: { total: -1 } },
    ]);
    const position = totals.findIndex((t) => String(t._id) === String(studentId));
    rank = position >= 0 ? position + 1 : null;
  }

  return {
    student,
    exam,
    entries,
    totalMarks,
    maxMarks,
    percentage,
    grade,
    passed,
    rank,
    isProvisional: exam.status !== 'published',
  };
}

module.exports = {
  defaultScheme,
  gradeFor,
  saveMarks,
  verifyMarks,
  lockMarks,
  requestCorrection,
  applyApprovedCorrection,
  relockExpired,
  publishReadiness,
  publishResults,
  reportCard,
  repos: { marks, exams, schemes },
};
