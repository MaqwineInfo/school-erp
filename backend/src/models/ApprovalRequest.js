const mongoose = require('mongoose');

/**
 * One instance of an approval workflow.
 *
 * Architecture §11. Carries the full decision history, which the RBAC document requires
 * for the audit trail ("all approvers, timestamps").
 */
const historySchema = new mongoose.Schema(
  {
    step: { type: Number },
    stepName: { type: String },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String },
    action: { type: String, enum: ['submitted', 'approved', 'rejected', 'escalated', 'cancelled', 'reminded'] },
    remarks: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const approvalRequestSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    workflowKey: { type: String, required: true, index: true },
    module: { type: String, required: true },

    resourceType: { type: String, required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },

    title: { type: String, required: true },
    /** Values the step conditions are evaluated against (amount in paise, percentage…). */
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    currentStep: { type: Number, default: 1 },
    totalSteps: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },

    /** Denormalised for the approver inbox query. */
    pendingApproverRole: { type: String },
    pendingApproverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dueAt: { type: Date },

    history: { type: [historySchema], default: [] },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

approvalRequestSchema.index({ tenantId: 1, status: 1, pendingApproverRole: 1 });
approvalRequestSchema.index({ tenantId: 1, resourceType: 1, resourceId: 1 });
approvalRequestSchema.index({ tenantId: 1, requestedBy: 1, status: 1 });
approvalRequestSchema.index({ status: 1, dueAt: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
