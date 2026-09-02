/**
 * Resolves what a user is *assigned to*: which academic groups they teach or own, which
 * departments they head, and which students that implies.
 *
 * The scope engine needs these to turn `dataScope: 'division'` or
 * `studentScope: 'assigned_students'` into concrete ids.
 *
 * PHASE NOTE: today this reads the legacy academic shape (`Standard.divisions[]` keyed by
 * an uppercase `divisionName` string, plus Timetable rows). Phase 3 introduces
 * `AcademicGroup` and `Enrolment` (architecture §8.2); when it lands, only this file
 * changes — the scope engine and every repository stay as they are. That is the point of
 * putting the lookup behind a provider.
 */
const mongoose = require('mongoose');

/** Per-request memo so a single request never resolves the same thing twice. */
function createAssignmentProvider() {
  const memo = new Map();

  const once = async (key, fn) => {
    if (memo.has(key)) return memo.get(key);
    const p = fn();
    memo.set(key, p);
    return p;
  };

  return {
    /**
     * Academic groups this user owns or teaches.
     * Returns an array of group identifiers. Under the legacy shape a group identifier is
     * `{ standardId, divisionName }`; under Phase 3 it becomes an AcademicGroup _id.
     */
    async groupsFor(user) {
      return once(`groups:${user.userId}`, async () => {
        const ids = [];

        /**
         * 0. Phase 3 shape — AcademicGroup.inchargeId.
         *
         * Checked FIRST and returned on its own when present. Mixing AcademicGroup ids
         * with legacy {standardId, divisionName} pairs in one array would break the
         * repository, which inspects the first element to decide which filter to build.
         */
        try {
          const AcademicGroup = mongoose.model('AcademicGroup');
          const owned = await AcademicGroup.find({
            tenantId: user.tenantId,
            inchargeId: user.userId,
            deletedAt: null,
            isActive: true,
          })
            .select('_id')
            .lean();

          if (owned.length) return owned.map((g) => g._id);
        } catch {
          /* model not registered */
        }

        // 1. Class-teacher ownership — Standard.divisions[].classTeacherId (legacy)
        try {
          const Standard = mongoose.model('Standard');
          const owned = await Standard.find({
            tenantId: user.tenantId,
            deletedAt: null,
            'divisions.classTeacherId': user.userId,
          })
            .select('_id divisions')
            .lean();

          for (const std of owned) {
            for (const div of std.divisions || []) {
              if (String(div.classTeacherId) === String(user.userId)) {
                ids.push({ standardId: std._id, divisionName: div.name });
              }
            }
          }
        } catch {
          /* model not registered (unit test) */
        }

        // 2. Teaching assignments — distinct class/section pairs from the timetable.
        try {
          const Timetable = mongoose.model('Timetable');
          const taught = await Timetable.aggregate([
            { $match: { tenantId: user.tenantId } },
            { $unwind: { path: '$slots', preserveNullAndEmptyArrays: true } },
            { $match: { 'slots.teacherId': new mongoose.Types.ObjectId(String(user.userId)) } },
            { $group: { _id: { standardId: '$standardId', divisionName: '$divisionName' } } },
          ]);
          for (const t of taught) {
            if (t._id?.standardId) {
              ids.push({ standardId: t._id.standardId, divisionName: t._id.divisionName });
            }
          }
        } catch {
          /* timetable shape may differ; ownership above still applies */
        }

        // De-duplicate on the composite key.
        const seen = new Set();
        return ids.filter((g) => {
          const k = `${g.standardId}:${g.divisionName}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      });
    },

    /** Departments this user heads or belongs to. */
    async departmentsFor(user) {
      return once(`depts:${user.userId}`, async () => {
        if (user.departmentIds?.length) return user.departmentIds;
        try {
          const Staff = mongoose.model('Staff');
          const staff = await Staff.findOne({ tenantId: user.tenantId, userId: user.userId })
            .select('departmentId')
            .lean();
          return staff?.departmentId ? [staff.departmentId] : [];
        } catch {
          return [];
        }
      });
    },

    /**
     * Students implied by this user's group assignments.
     *
     * Handles BOTH shapes `groupsFor` can return — AcademicGroup ids (Phase 3) and legacy
     * {standardId, divisionName} pairs. Assuming only the legacy shape silently produced
     * an empty list once groups gained ids, which made a class teacher unable to mark
     * attendance for their own class.
     */
    async assignedStudentsFor(user) {
      return once(`students:${user.userId}`, async () => {
        const groups = await this.groupsFor(user);
        if (!groups.length) return [];

        const isLegacyPair =
          typeof groups[0] === 'object' && groups[0] !== null && 'standardId' in groups[0];

        // Phase 3 shape: the enrolment table is the authoritative roster.
        if (!isLegacyPair) {
          try {
            const Enrolment = mongoose.model('Enrolment');
            const rows = await Enrolment.find({
              tenantId: user.tenantId,
              academicGroupId: { $in: groups },
              status: 'active',
              deletedAt: null,
            })
              .select('studentId')
              .lean();
            if (rows.length) return rows.map((r) => r.studentId);
          } catch {
            /* fall through to the denormalised Student lookup */
          }

          try {
            const Student = mongoose.model('Student');
            const students = await Student.find({
              tenantId: user.tenantId,
              academicGroupId: { $in: groups },
              deletedAt: null,
            })
              .select('_id')
              .lean();
            return students.map((s) => s._id);
          } catch {
            return [];
          }
        }

        // Legacy shape.
        try {
          const Student = mongoose.model('Student');
          const students = await Student.find({
            tenantId: user.tenantId,
            deletedAt: null,
            $or: groups.map((g) => ({ standardId: g.standardId, divisionName: g.divisionName })),
          })
            .select('_id')
            .lean();
          return students.map((s) => s._id);
        } catch {
          return [];
        }
      });
    },

    /** The tenant's currently active academic year. */
    async currentAcademicYear(user) {
      return once(`ay:${user.tenantId}`, async () => {
        try {
          const AcademicYear = mongoose.model('AcademicYear');
          const ay = await AcademicYear.findOne({
            tenantId: user.tenantId,
            isActive: true,
            deletedAt: null,
          })
            .select('_id')
            .lean();
          return ay?._id ?? null;
        } catch {
          return null;
        }
      });
    },
  };
}

module.exports = { createAssignmentProvider };
