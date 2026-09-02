const mongoose = require('mongoose');

/**
 * Course — the coaching-side counterpart of `Standard`.
 *
 * Feature-brainstorm §6. A coaching centre does not have Class 8; it has "JEE Main —
 * Physics" running for six months with several batches at different timings.
 */
const courseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String },

    /** Target audience, e.g. "Class 11-12", "NEET aspirants". */
    targetAudience: { type: String },
    subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],

    durationMonths: { type: Number, default: 12 },

    /**
     * How this course is billed. Drives demand generation (D10).
     *  - one_time  : a single charge at enrolment
     *  - monthly   : recurring, prorated from the join date
     *  - installment: fixed instalments with due dates
     */
    feeModel: {
      type: String,
      enum: ['one_time', 'monthly', 'installment'],
      default: 'monthly',
    },
    /** Base fee in PAISE (ADR-07). */
    baseFee: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

courseSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null, code: { $type: 'string' } } });
courseSchema.index({ tenantId: 1, branchId: 1, isActive: 1 });

module.exports = mongoose.model('Course', courseSchema);
