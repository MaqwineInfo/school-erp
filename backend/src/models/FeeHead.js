const mongoose = require('mongoose');

/**
 * A fee head — Tuition, Transport, Lab, Activity, Admission…
 *
 * Carries the GST treatment, which is per head rather than per invoice: specification
 * §10.5 makes tuition exempt while transport, hostel, mess and uniform are taxable.
 */
const feeHeadSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String },

    category: {
      type: String,
      enum: ['tuition', 'admission', 'transport', 'hostel', 'mess', 'activity', 'exam', 'uniform', 'book', 'deposit', 'fine', 'other'],
      default: 'other',
    },

    /** GST — 0 for exempt heads such as tuition. HSN/SAC is required for taxable ones. */
    gstRate: { type: Number, default: 0, min: 0, max: 28 },
    hsnSac: { type: String, trim: true },

    isRefundable: { type: Boolean, default: false },
    /** A caution deposit is refunded on leaving rather than consumed. */
    isDeposit: { type: Boolean, default: false },
    /** Concessions and waivers cannot be applied to some heads (e.g. government levies). */
    concessionAllowed: { type: Boolean, default: true },

    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

feeHeadSchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

module.exports = mongoose.model('FeeHead', feeHeadSchema);
