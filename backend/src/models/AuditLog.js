const mongoose = require('mongoose');

/**
 * Append-only audit log — NEVER edit or delete entries.
 * Source: RBAC_Permission_Architecture_Plan.md — Section 6.3
 *
 * Retention:
 *  - Financial (fees, payroll, expenses): 7 years
 *  - Academic (marks, report cards): 3 years
 *  - Student PII access: 3 years
 *  - Certificates (TC): Permanent
 *  - Role management changes: 7 years
 *  - Authentication: 1 year
 */
const auditLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  // Who did it
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userEmail: { type: String },
  userRole: { type: String },
  userName: { type: String },

  // What was done
  module: { type: String, required: true },
  action: { type: String, required: true },        // e.g. 'create', 'update', 'delete', 'approve', 'export', 'login', 'view_pii'
  resourceType: { type: String },                  // e.g. 'FeeDemand', 'Student', 'Payroll'
  resourceId: { type: String },                    // ObjectId as string
  resourceLabel: { type: String },                 // human-readable e.g. "Fee Receipt #2024-001"

  // Change data
  oldValue: { type: mongoose.Schema.Types.Mixed }, // snapshot before change
  newValue: { type: mongoose.Schema.Types.Mixed }, // snapshot after change
  reason: { type: String },                        // for corrections, approvals

  // Request metadata
  ip: { type: String },
  userAgent: { type: String },

  // Severity
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },

  // Tags for filtering
  tags: [{ type: String }], // e.g. ['financial', 'pii', 'mark_correction']
}, {
  timestamps: true,
  // Disable versioning — immutable
});

// Immutable guard: prevent updates/deletes at schema level
auditLogSchema.pre('findOneAndUpdate', function () { throw new Error('AuditLog is immutable'); });
auditLogSchema.pre('updateOne', function () { throw new Error('AuditLog is immutable'); });
auditLogSchema.pre('updateMany', function () { throw new Error('AuditLog is immutable'); });
auditLogSchema.pre('findOneAndDelete', function () { throw new Error('AuditLog is immutable'); });
auditLogSchema.pre('deleteOne', function () { throw new Error('AuditLog is immutable'); });
auditLogSchema.pre('deleteMany', function () { throw new Error('AuditLog is immutable'); });

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
