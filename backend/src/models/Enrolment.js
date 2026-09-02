const mongoose = require('mongoose');

/**
 * Enrolment — student ⇄ academic group ⇄ academic year.
 *
 * ADR-04 / architecture §8.2. `docs/workflows/admission-flow.md` already wrote
 * "Create StudentEnrollment" against a model that was never built.
 *
 * Why it matters: `Student.standardId` was overwritten on promotion, so the question
 * "who was in 8-A during 2025-26?" was unanswerable — which breaks year-over-year
 * reporting, alumni records and any board/RTE submission needing a historical roster.
 *
 * INVARIANT (D9): exactly ONE active enrolment per student, enforced by a partial unique
 * index. To allow a student in several batches at once (many-to-many), drop that index —
 * no consumer changes, because every consumer already joins through this record.
 */
const enrolmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },

    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    academicGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup', required: true },

    /**
     * Denormalised legacy pair, maintained during the dual-write window
     * (architecture §21 step 4) so un-migrated queries keep working. Dropped afterwards.
     */
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    divisionName: { type: String },

    rollNo: { type: String },

    status: {
      type: String,
      enum: ['active', 'completed', 'promoted', 'transferred', 'withdrawn', 'detained'],
      default: 'active',
    },

    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },

    /** Set when this enrolment came from promoting a previous one. */
    previousEnrolmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrolment', default: null },

    /** Coaching: fee is prorated from the join date within the batch's period. */
    isProrated: { type: Boolean, default: false },

    remarks: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** The single-active invariant. Drop this index to permit many-to-many. */
enrolmentSchema.index(
  { tenantId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'active', deletedAt: null } },
);
enrolmentSchema.index({ tenantId: 1, academicGroupId: 1, status: 1 });
enrolmentSchema.index({ tenantId: 1, academicYearId: 1, studentId: 1 });
enrolmentSchema.index(
  { tenantId: 1, academicGroupId: 1, rollNo: 1 },
  { unique: true, partialFilterExpression: { rollNo: { $type: 'string' }, deletedAt: null } },
);

module.exports = mongoose.model('Enrolment', enrolmentSchema);
