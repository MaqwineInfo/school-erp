const mongoose = require('mongoose');

/**
 * A concession granted to one student.
 *
 * Specification §10.2. Some kinds apply automatically (sibling, RTE); the rest go through
 * the approval workflow in RBAC §5.1, and the concession is NOT effective until approved —
 * which is the behaviour the old `applyConcession` skipped entirely.
 */
const concessionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },

    type: {
      type: String,
      enum: ['sibling', 'staff_ward', 'merit', 'sports', 'need_based', 'rte', 'single_parent', 'other'],
      required: true,
    },

    /** Either a percentage of the applicable amount, or a flat paise amount. */
    isPercentage: { type: Boolean, default: true },
    value: { type: Number, required: true, min: 0 },

    /** Restrict to specific heads; empty means every concession-eligible head. */
    feeHeadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead' }],

    reason: { type: String },
    supportingDocs: [{ type: String }],

    /** RTE and sibling discounts are auto-applied; everything else needs sign-off. */
    requiresApproval: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
      index: true,
    },
    approvalRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: null },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

concessionSchema.index({ tenantId: 1, studentId: 1, academicYearId: 1, status: 1 });

concessionSchema.methods.isEffective = function isEffective(at = new Date()) {
  if (this.status !== 'approved') return false;
  if (this.validFrom && at < this.validFrom) return false;
  if (this.validTo && at > this.validTo) return false;
  return true;
};

module.exports = mongoose.model('Concession', concessionSchema);
