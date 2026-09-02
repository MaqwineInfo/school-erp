const mongoose = require('mongoose');

/**
 * A fee structure — what a given cohort pays, and when.
 *
 * Supports all four billing shapes from D10 through one `schedule` discriminator, so the
 * demand generator has a single code path:
 *   annual_installments — school: components split across dated instalments
 *   monthly             — recurring, prorated from the join date
 *   one_time            — a single charge (admission, exam, event)
 *   per_course          — coaching: attached to a Course rather than a Standard
 *
 * All amounts are integer PAISE (ADR-07).
 */
const componentSchema = new mongoose.Schema(
  {
    feeHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead', required: true },
    name: { type: String, required: true }, // denormalised for receipts
    amount: { type: Number, required: true, min: 0 }, // paise
    gstRate: { type: Number, default: 0 },
    isOptional: { type: Boolean, default: false },
  },
  { _id: false },
);

const installmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Term 1", "April"
    dueDate: { type: Date, required: true },
    /** Percentage of the total due in this instalment; must sum to 100 across the set. */
    percentage: { type: Number, min: 0, max: 100 },
    /** Or an explicit amount in paise, when the split is not proportional. */
    amount: { type: Number, min: 0 },
  },
  { _id: false },
);

const feeStructureSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },

    name: { type: String, required: true, trim: true },

    /** Applies to a class (school) or a course (coaching). One of the two. */
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', default: null },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },

    /** Optional narrowing — a different structure for RTE or EWS students. */
    category: {
      type: String,
      enum: ['all', 'general', 'obc', 'sc', 'st', 'ews', 'rte'],
      default: 'all',
    },
    stream: { type: String, enum: ['science', 'commerce', 'arts', 'vocational', ''], default: '' },

    schedule: {
      type: String,
      enum: ['annual_installments', 'monthly', 'one_time', 'per_course'],
      default: 'annual_installments',
    },

    components: { type: [componentSchema], default: [] },
    installments: { type: [installmentSchema], default: [] },

    /** Cached sum of components, in paise. Recomputed on save. */
    totalAmount: { type: Number, default: 0 },

    lateFee: {
      enabled: { type: Boolean, default: false },
      mode: { type: String, enum: ['per_day', 'per_month', 'flat', 'slab'], default: 'per_day' },
      amount: { type: Number, default: 0 }, // paise
      graceDays: { type: Number, default: 0 },
      maxAmount: { type: Number, default: 0 }, // 0 = uncapped
    },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

feeStructureSchema.index({ tenantId: 1, academicYearId: 1, standardId: 1, category: 1 });
feeStructureSchema.index({ tenantId: 1, academicYearId: 1, courseId: 1 });

feeStructureSchema.pre('save', function computeTotal(next) {
  this.totalAmount = (this.components || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  next();
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
