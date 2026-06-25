const mongoose = require('mongoose');

/**
 * Simple 2-step approval: request → approve/reject
 * Used for leave, fee concessions, expenses, mark corrections, certificates, admissions, payroll, inventory
 */
const approvalRequestSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  module: { type: String, required: true }, // hr, fees, expenses, examinations, etc.
  type: {
    type: String,
    required: true,
    enum: [
      'leave', 'fee_concession', 'expense', 'mark_correction',
      'certificate', 'admission', 'payroll', 'inventory', 'student_transfer',
    ],
  },

  title: { type: String, required: true },
  description: { type: String },

  resourceType: { type: String }, // Leave, FeeDemand, Expense, etc.
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },

  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },

  metadata: { type: mongoose.Schema.Types.Mixed }, // amount, student name, etc.
}, { timestamps: true });

approvalRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
