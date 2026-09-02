/**
 * Attendance service.
 *
 * Phase 7. Adds the behaviour specification §9 requires and the previous 98-line
 * controller had none of: multi-source ingestion with deduplication, an edit window with
 * Principal override, absence notification, and long-absence detection.
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const { repo } = require('../../infra/repository/BaseRepository');
const { publish } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const { record } = require('../../platform/audit/auditLogger');
const { Scope } = require('../../platform/scope/scope');
const { BusinessRuleError, NotFoundError, ForbiddenError } = require('../../shared/errors');

const attendance = () => repo(mongoose.model('Attendance'));

/** Specification §9: attendance may be edited freely for 24 hours. */
const FREE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Is this date a declared holiday for the tenant? */
async function isHoliday(scope, date) {
  const AcademicYear = mongoose.model('AcademicYear');
  const day = startOfDay(date);

  const year = await AcademicYear.findOne({
    tenantId: scope.tenantId,
    isActive: true,
    deletedAt: null,
  }).lean();

  if (!year) return false;
  return (year.holidays ?? []).some((h) => startOfDay(h.date).getTime() === day.getTime());
}

/**
 * Mark attendance for a whole group.
 *
 * Upserts one document per (group, date, period). Re-marking within the free-edit window
 * is allowed and silent; after it, a reason and `approve` permission are required, and
 * each change is recorded as a correction.
 */
async function markAttendance(scope, input, opts = {}) {
  const { academicGroupId, date, periodNo = 0, subjectId, session = 'full_day', records, reason } = input;

  return uow.run(async (txn) => {
    const Attendance = mongoose.model('Attendance');
    const academics = require('../academics');

    const group = await repo(mongoose.model('AcademicGroup')).findByIdOrFail(scope, academicGroupId, {
      session: txn,
    });

    const day = startOfDay(date);
    if (day > new Date()) {
      throw new BusinessRuleError('Attendance cannot be marked for a future date');
    }

    if (await isHoliday(scope, day)) {
      throw new BusinessRuleError('That date is a declared holiday');
    }

    // Only students actually enrolled in this group may appear.
    const enrolled = (await academics.service.studentIdsInGroup(scope, academicGroupId)).map(String);
    const strangers = records.filter((r) => !enrolled.includes(String(r.studentId)));
    if (strangers.length) {
      throw new BusinessRuleError(
        `${strangers.length} student(s) are not enrolled in this class`,
        strangers.map((s) => ({ studentId: String(s.studentId) })),
      );
    }

    const existing = await Attendance.findOne({
      tenantId: scope.tenantId,
      academicGroupId,
      date: day,
      periodNo,
    }).session(txn);

    // ── Editing an existing sheet ──────────────────────────────────────────
    if (existing) {
      const age = Date.now() - (existing.markedAt ?? existing.createdAt).getTime();
      const isLate = age > FREE_EDIT_WINDOW_MS;

      if (isLate) {
        // Specification §9: after T+24h this needs an override. The route passes
        // `canOverride` from req.permission.canApprove, so the authority comes from RBAC
        // rather than from a role name.
        if (!opts.canOverride) {
          throw new ForbiddenError(
            'Attendance older than 24 hours can only be changed with a Principal override',
          );
        }
        if (!reason) {
          throw new BusinessRuleError('A reason is required to change attendance after 24 hours');
        }
      }

      const before = existing.toObject();
      const byStudent = new Map(existing.records.map((r) => [String(r.studentId), r]));

      for (const incoming of records) {
        const current = byStudent.get(String(incoming.studentId));
        if (current && current.status !== incoming.status) {
          existing.corrections.push({
            studentId: incoming.studentId,
            from: current.status,
            to: incoming.status,
            reason: reason ?? 'Corrected',
            changedBy: scope.userId,
            wasOverride: isLate,
            at: new Date(),
          });
        }
        if (current) {
          Object.assign(current, incoming);
        } else {
          existing.records.push(incoming);
        }
      }

      existing.markedBy = scope.userId;
      await existing.save({ session: txn });

      record({
        req: opts.req,
        module: 'attendance',
        action: isLate ? 'override_correction' : 'edit',
        resourceType: 'Attendance',
        resourceId: existing._id,
        before,
        after: existing.toObject(),
        reason,
      });

      return existing;
    }

    // ── First marking ──────────────────────────────────────────────────────
    const [created] = await Attendance.create(
      [
        {
          tenantId: scope.tenantId,
          branchId: group.branchId,
          academicYearId: group.academicYearId,
          academicGroupId,
          standardId: group.standardId ?? null,
          divisionName: group.kind === 'section' ? group.name : null,
          date: day,
          session,
          isPeriodWise: periodNo > 0,
          periodNo,
          subjectId,
          records,
          markedBy: scope.userId,
          markedAt: new Date(),
        },
      ],
      { session: txn },
    );

    await publish(
      EVENTS.ATTENDANCE_MARKED,
      {
        tenantId: scope.tenantId,
        branchId: String(group.branchId),
        academicGroupId: String(academicGroupId),
        date: day,
        summary: created.summary,
      },
      { session: txn, req: opts.req },
    );

    return created;
  }, opts);
}

/**
 * Ingest a device event (biometric, RFID, QR, face).
 *
 * Deduplicates within 5 minutes for the same student, per Plan.docx §13 — a student who
 * taps twice at the gate must not produce two marks.
 */
async function ingestDeviceEvent(scope, { studentId, timestamp, source, deviceId }, opts = {}) {
  const Attendance = mongoose.model('Attendance');
  const Student = mongoose.model('Student');

  const student = await repo(Student).findById(scope, studentId, { lean: true });
  if (!student) throw new NotFoundError('Student not found');
  if (!student.academicGroupId) {
    throw new BusinessRuleError('This student is not enrolled in any class');
  }

  const at = new Date(timestamp ?? Date.now());
  const day = startOfDay(at);

  const sheet = await Attendance.findOne({
    tenantId: scope.tenantId,
    academicGroupId: student.academicGroupId,
    date: day,
    periodNo: 0,
  });

  // Deduplicate: already marked present within the last five minutes.
  if (sheet) {
    const existing = sheet.records.find((r) => String(r.studentId) === String(studentId));
    if (existing && existing.status === 'present') {
      const lastMark = sheet.markedAt ?? sheet.updatedAt;
      if (Math.abs(at - lastMark) < 5 * 60 * 1000) {
        return { deduplicated: true, attendance: sheet };
      }
    }
  }

  const entry = {
    studentId,
    status: 'present',
    source: source ?? 'biometric',
    inTime: at.toTimeString().slice(0, 5),
  };

  if (!sheet) {
    const created = await markAttendance(
      scope,
      { academicGroupId: student.academicGroupId, date: day, records: [entry] },
      opts,
    );
    return { deduplicated: false, attendance: created, deviceId };
  }

  const found = sheet.records.find((r) => String(r.studentId) === String(studentId));
  if (found) Object.assign(found, entry);
  else sheet.records.push(entry);

  await sheet.save();
  return { deduplicated: false, attendance: sheet, deviceId };
}

/**
 * Is this student within the caller's scope? Throws if not.
 *
 * Needed because the Attendance collection has no top-level `studentId` (records are
 * embedded), so the student dimension cannot be applied by the repository. Without an
 * explicit check a parent could read any child's summary; with the wrong check — applying
 * `dataScope: 'own'` against `markedBy` — a parent reads nothing at all, because they did
 * not mark the register.
 */
async function assertStudentInScope(scope, studentId) {
  if (scope.isSystem) return;

  if (scope.studentIds !== 'ALL' && !scope.studentIds.map(String).includes(String(studentId))) {
    throw new NotFoundError('Student not found');
  }

  // Confirm the student is otherwise visible (tenant, branch, group).
  const students = repo(mongoose.model('Student'));
  const visible = await students.findById(scope, studentId, { select: '_id', lean: true });
  if (!visible) throw new NotFoundError('Student not found');
}

/** Per-student attendance summary over a date range. */
async function studentSummary(scope, { studentId, from, to }) {
  await assertStudentInScope(scope, studentId);

  // The student is already authorised, so the aggregate is constrained by tenant, branch
  // and date only — not by who happened to mark the register.
  const reading = new Scope({
    ...scope.toJSON(),
    dataScope: scope.dataScope === 'own' ? 'school' : scope.dataScope,
  });

  const rows = await attendance().aggregate(reading, [
    { $match: { date: { $gte: new Date(from), $lte: new Date(to) } } },
    { $unwind: '$records' },
    { $match: { 'records.studentId': new mongoose.Types.ObjectId(String(studentId)) } },
    { $group: { _id: '$records.status', count: { $sum: 1 } } },
  ]);

  const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const present = (counts.present ?? 0) + (counts.late ?? 0) + (counts.half_day ?? 0);
  const total = Object.values(counts).reduce((s, c) => s + c, 0) - (counts.holiday ?? 0);

  return {
    ...counts,
    workingDays: total,
    presentDays: present,
    percentage: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0,
  };
}

/** Daily register for a group. */
async function groupRegister(scope, { academicGroupId, date }) {
  const sheet = await attendance().findOne(
    scope,
    { academicGroupId, date: startOfDay(date), periodNo: 0 },
    { populate: { path: 'records.studentId', select: 'name admissionNo rollNo photo' } },
  );
  return sheet;
}

/**
 * Queue absence notifications for sheets marked today.
 * Idempotent via `notifiedAt`, so a re-run never double-notifies.
 */
async function notifyAbsentees() {
  const Attendance = mongoose.model('Attendance');
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const sheets = await Attendance.find({
    date: { $gte: startOfDay(since) },
    notifiedAt: null,
    'summary.absent': { $gt: 0 },
  }).limit(500);

  let queued = 0;

  for (const sheet of sheets) {
    const absentees = sheet.records.filter((r) => r.status === 'absent');

    for (const a of absentees) {
      await publish(EVENTS.ATTENDANCE_ABSENT, {
        tenantId: sheet.tenantId,
        branchId: sheet.branchId,
        studentId: String(a.studentId),
        academicGroupId: String(sheet.academicGroupId),
        date: sheet.date,
      });
      queued += 1;
    }

    sheet.notifiedAt = new Date();
    await sheet.save();
  }

  return queued;
}

/**
 * Flag students absent for 3, 7 or 15 consecutive days (specification §9.1).
 */
async function detectLongAbsence(thresholds = [3, 7, 15]) {
  const Attendance = mongoose.model('Attendance');
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - Math.max(...thresholds) - 5);

  const rows = await Attendance.aggregate([
    { $match: { date: { $gte: lookback } } },
    { $unwind: '$records' },
    { $match: { 'records.status': 'absent' } },
    {
      $group: {
        _id: { studentId: '$records.studentId', tenantId: '$tenantId' },
        days: { $addToSet: '$date' },
        branchId: { $first: '$branchId' },
        academicGroupId: { $first: '$academicGroupId' },
      },
    },
  ]);

  let flagged = 0;

  for (const row of rows) {
    // Longest run of consecutive calendar days.
    const days = row.days.map((d) => startOfDay(d).getTime()).sort((a, b) => a - b);
    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i += 1) {
      const gap = (days[i] - days[i - 1]) / 86400000;
      run = gap === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    }

    const hit = thresholds.filter((t) => longest >= t).pop();
    if (!hit) continue;

    await publish(EVENTS.ATTENDANCE_LONG_ABSENCE, {
      tenantId: row._id.tenantId,
      branchId: row.branchId,
      studentId: String(row._id.studentId),
      academicGroupId: String(row.academicGroupId),
      consecutiveDays: longest,
      threshold: hit,
    });
    flagged += 1;
  }

  return flagged;
}

module.exports = {
  markAttendance,
  assertStudentInScope,
  ingestDeviceEvent,
  studentSummary,
  groupRegister,
  notifyAbsentees,
  detectLongAbsence,
  isHoliday,
  startOfDay,
  FREE_EDIT_WINDOW_MS,
  repos: { attendance },
};
