const mongoose = require('mongoose');

/**
 * A pluggable grading scheme.
 *
 * Specification §11.2 lists CBSE (A1–E), ICSE, IB (1–7), Cambridge and CCE. The previous
 * code hard-coded the CBSE bands inside `marks.controller.js#getGrade`, so no other board
 * could be supported without editing that function — and the product targets State Boards
 * as a v1 segment.
 *
 * Making it data means IB and Cambridge become configuration, not a rewrite
 * (feature-brainstorm §2.2).
 */
const bandSchema = new mongoose.Schema(
  {
    grade: { type: String, required: true }, // A1, A, 7, Distinction
    minPercent: { type: Number, required: true, min: 0, max: 100 },
    maxPercent: { type: Number, required: true, min: 0, max: 100 },
    gradePoint: { type: Number },
    description: { type: String }, // "Outstanding"
  },
  { _id: false },
);

const gradeSchemeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    name: { type: String, required: true, trim: true },
    board: {
      type: String,
      enum: ['CBSE', 'ICSE', 'IB', 'CAMBRIDGE', 'STATE', 'CCE', 'CUSTOM'],
      default: 'CBSE',
    },

    bands: { type: [bandSchema], default: [] },

    /** Percentage at or above which a subject is passed. */
    passPercent: { type: Number, default: 33 },
    /** Grade awarded when the student was absent. */
    absentGrade: { type: String, default: 'AB' },

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

gradeSchemeSchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

/** Grade for a percentage, or null when no band matches. */
gradeSchemeSchema.methods.gradeFor = function gradeFor(percent) {
  const band = this.bands.find((b) => percent >= b.minPercent && percent <= b.maxPercent);
  return band ? band.grade : null;
};

/** The CBSE scheme from specification §11.2, used as the seeded default. */
gradeSchemeSchema.statics.CBSE_BANDS = [
  { grade: 'A1', minPercent: 91, maxPercent: 100, gradePoint: 10, description: 'Outstanding' },
  { grade: 'A2', minPercent: 81, maxPercent: 90.99, gradePoint: 9, description: 'Excellent' },
  { grade: 'B1', minPercent: 71, maxPercent: 80.99, gradePoint: 8, description: 'Very Good' },
  { grade: 'B2', minPercent: 61, maxPercent: 70.99, gradePoint: 7, description: 'Good' },
  { grade: 'C1', minPercent: 51, maxPercent: 60.99, gradePoint: 6, description: 'Fair' },
  { grade: 'C2', minPercent: 41, maxPercent: 50.99, gradePoint: 5, description: 'Average' },
  { grade: 'D', minPercent: 33, maxPercent: 40.99, gradePoint: 4, description: 'Below Average' },
  { grade: 'E', minPercent: 0, maxPercent: 32.99, gradePoint: 0, description: 'Needs Improvement' },
];

module.exports = mongoose.model('GradeScheme', gradeSchemeSchema);
