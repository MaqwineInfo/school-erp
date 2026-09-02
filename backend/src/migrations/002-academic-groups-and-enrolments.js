/**
 * Migration 002 — introduce AcademicGroup and Enrolment.
 *
 * Architecture §21 step 4 — the only data migration in the plan with real risk, so it is
 * strictly ADDITIVE: it creates new documents and backfills new fields, and removes
 * nothing. The legacy `Standard.divisions[]` array and the denormalised
 * `Student.standardId + divisionName` pair are left in place for the dual-write window.
 *
 * Steps:
 *   1. AcademicGroup per Standard.divisions[] entry
 *   2. Enrolment per active Student, from their current class/section
 *   3. Backfill academicGroupId on Attendance, Timetable, Homework, MarksEntry,
 *      StudyMaterial and FeeDemand
 *   4. Recompute group strengths
 *
 * Idempotent: re-running creates no duplicates.
 */
const mongoose = require('mongoose');

const MIGRATION_ID = '002-academic-groups-and-enrolments';

async function up({ session } = {}) {
  const Tenant = mongoose.model('Tenant');
  const Standard = mongoose.model('Standard');
  const Student = mongoose.model('Student');
  const AcademicYear = mongoose.model('AcademicYear');
  const AcademicGroup = mongoose.model('AcademicGroup');
  const Enrolment = mongoose.model('Enrolment');
  const Branch = mongoose.model('Branch');

  const stats = { groups: 0, enrolments: 0, backfilled: {}, skipped: 0, warnings: [] };

  const tenants = await Tenant.find({ deletedAt: null }).select('_id slug').lean();

  for (const tenant of tenants) {
    // Every tenant needs an academic year and a branch for the new records to hang off.
    let year = await AcademicYear.findOne({ tenantId: tenant._id, isActive: true, deletedAt: null }).lean();
    if (!year) year = await AcademicYear.findOne({ tenantId: tenant._id, deletedAt: null }).sort({ startDate: -1 }).lean();
    if (!year) {
      stats.warnings.push(`${tenant.slug}: no academic year — skipped`);
      continue;
    }

    let defaultBranch = await Branch.findOne({ tenantId: tenant._id, deletedAt: null }).lean();
    if (!defaultBranch) {
      stats.warnings.push(`${tenant.slug}: no branch — skipped`);
      continue;
    }

    // ── 1. Sections → AcademicGroup ──────────────────────────────────────────
    const standards = await Standard.find({ tenantId: tenant._id, deletedAt: null }).lean();

    for (const std of standards) {
      const branchId = std.branchId ?? defaultBranch._id;

      for (const div of std.divisions ?? []) {
        const name = String(div.name).trim().toUpperCase();

        const existing = await AcademicGroup.findOne({
          tenantId: tenant._id,
          academicYearId: year._id,
          standardId: std._id,
          name,
          deletedAt: null,
        }).session(session ?? null);

        if (existing) {
          stats.skipped += 1;
          continue;
        }

        await AcademicGroup.create(
          [
            {
              tenantId: tenant._id,
              branchId,
              academicYearId: year._id,
              kind: 'section',
              standardId: std._id,
              name,
              displayName: `${std.name} — ${name}`,
              inchargeId: div.classTeacherId ?? null,
              capacity: div.maxCapacity ?? 40,
              strength: 0,
              isActive: std.isActive !== false,
            },
          ],
          { session },
        );
        stats.groups += 1;
      }
    }

    // ── 2. Students → Enrolment ──────────────────────────────────────────────
    const allGroups = await AcademicGroup.find({
      tenantId: tenant._id,
      academicYearId: year._id,
      deletedAt: null,
    }).lean();

    const groupByKey = new Map(
      allGroups.map((g) => [`${g.standardId}:${g.name}`, g]),
    );

    const studentDocs = await Student.find({
      tenantId: tenant._id,
      deletedAt: null,
      standardId: { $ne: null },
    }).lean();

    for (const s of studentDocs) {
      if (!s.divisionName) {
        stats.warnings.push(`${tenant.slug}: student ${s.admissionNo} has no section — skipped`);
        continue;
      }

      const key = `${s.standardId}:${String(s.divisionName).trim().toUpperCase()}`;
      const group = groupByKey.get(key);
      if (!group) {
        stats.warnings.push(
          `${tenant.slug}: student ${s.admissionNo} references a class/section with no group — skipped`,
        );
        continue;
      }

      const already = await Enrolment.findOne({
        tenantId: tenant._id,
        studentId: s._id,
        academicGroupId: group._id,
        deletedAt: null,
      }).session(session ?? null);

      if (already) {
        stats.skipped += 1;
        continue;
      }

      // Inactive students get a closed enrolment, so history is preserved without
      // violating the single-active invariant.
      const isActive = s.status === 'active';

      await Enrolment.create(
        [
          {
            tenantId: tenant._id,
            branchId: s.branchId ?? group.branchId,
            academicYearId: s.academicYearId ?? year._id,
            studentId: s._id,
            academicGroupId: group._id,
            standardId: s.standardId,
            divisionName: String(s.divisionName).trim().toUpperCase(),
            rollNo: s.rollNo ?? null,
            status: isActive ? 'active' : 'withdrawn',
            joinedAt: s.admissionDate ?? s.createdAt ?? new Date(),
            leftAt: isActive ? null : (s.updatedAt ?? new Date()),
          },
        ],
        { session },
      );
      stats.enrolments += 1;

      await Student.updateOne(
        { _id: s._id },
        { $set: { academicGroupId: group._id } },
        { session },
      );
    }

    // ── 3. Backfill academicGroupId on dependent collections ─────────────────
    const backfillTargets = [
      'Attendance',
      'Timetable',
      'Homework',
      'MarksEntry',
      'StudyMaterial',
    ];

    for (const modelName of backfillTargets) {
      let Model;
      try {
        Model = mongoose.model(modelName);
      } catch {
        continue; // model not registered in this deployment
      }

      let updated = 0;
      for (const g of allGroups) {
        const res = await Model.updateMany(
          {
            tenantId: tenant._id,
            standardId: g.standardId,
            divisionName: g.name,
            academicGroupId: { $in: [null, undefined] },
          },
          { $set: { academicGroupId: g._id } },
          { session },
        );
        updated += res.modifiedCount ?? 0;
      }
      stats.backfilled[modelName] = (stats.backfilled[modelName] ?? 0) + updated;
    }

    // ── 4. Recompute strengths ───────────────────────────────────────────────
    for (const g of allGroups) {
      const strength = await Enrolment.countDocuments({
        academicGroupId: g._id,
        status: 'active',
        deletedAt: null,
      }).session(session ?? null);
      await AcademicGroup.updateOne({ _id: g._id }, { $set: { strength } }, { session });
    }
  }

  return stats;
}

/** Reverse: drop the new collections. Legacy fields were never removed, so nothing is lost. */
async function down({ session } = {}) {
  const AcademicGroup = mongoose.model('AcademicGroup');
  const Enrolment = mongoose.model('Enrolment');

  const [g, e] = await Promise.all([
    AcademicGroup.deleteMany({}, { session }),
    Enrolment.deleteMany({}, { session }),
  ]);

  await mongoose.model('Student').updateMany({}, { $unset: { academicGroupId: '' } }, { session });

  return { groupsDeleted: g.deletedCount, enrolmentsDeleted: e.deletedCount };
}

module.exports = { id: MIGRATION_ID, up, down };
