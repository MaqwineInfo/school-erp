const mongoose = require('mongoose');

/**
 * AcademicGroup — the unified academic unit.
 *
 * ADR-03 / architecture §8.2. Replaces `Standard.divisions[]`, which was an embedded
 * subdocument array referenced everywhere by an uppercase string (`divisionName`). That
 * design had three problems this fixes:
 *
 *   1. Divisions had no stable identity — renaming Section A to "Alpha" orphaned every
 *      attendance record, timetable slot and marks entry keyed on the string "A".
 *   2. There was no way to model a coaching batch, where the parent is a Course rather
 *      than a Standard and students are grouped by timing and faculty.
 *   3. Nothing could reference "the group" as a first-class thing, so scope filtering had
 *      to match on two denormalised fields.
 *
 * A group renders as "Class 8 — Section A" for schools and "JEE Physics — Mon/Wed 6PM"
 * for coaching, decided by `Tenant.institutionType`.
 */
const academicGroupSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },

    /** section = school class-section; batch = coaching batch. */
    kind: { type: String, enum: ['section', 'batch'], required: true, default: 'section' },

    /** Parent container: a Standard for a section, a Course for a batch. */
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', default: null },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },

    /** "A" for a section; "Mon/Wed 6PM" for a batch. */
    name: { type: String, required: true, trim: true },
    /** Full display label, denormalised for lists: "Class 8 — A". */
    displayName: { type: String },

    /** Class teacher for a section; faculty for a batch. */
    inchargeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    roomNo: { type: String },

    /** Stream applies to senior-secondary sections only. */
    stream: { type: String, enum: ['science', 'commerce', 'arts', 'vocational', ''], default: '' },

    capacity: { type: Number, default: 40 },
    /** Maintained by the enrolment service; never written by hand. */
    strength: { type: Number, default: 0 },

    /** Batch scheduling (coaching). */
    schedule: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
        startTime: { type: String }, // "18:00"
        endTime: { type: String },
        _id: false,
      },
    ],

    startDate: { type: Date },
    endDate: { type: Date },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

academicGroupSchema.index(
  { tenantId: 1, academicYearId: 1, standardId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null, kind: 'section' } },
);
academicGroupSchema.index({ tenantId: 1, branchId: 1, academicYearId: 1, kind: 1 });
academicGroupSchema.index({ tenantId: 1, inchargeId: 1 });
academicGroupSchema.index({ tenantId: 1, courseId: 1 });

academicGroupSchema.pre('save', function normalise(next) {
  if (this.kind === 'section' && this.name) {
    // Section names stay uppercase, matching the invariant academic.service already had.
    this.name = String(this.name).trim().toUpperCase();
  }
  next();
});

academicGroupSchema.methods.isFull = function isFull() {
  return this.capacity > 0 && this.strength >= this.capacity;
};

module.exports = mongoose.model('AcademicGroup', academicGroupSchema);
