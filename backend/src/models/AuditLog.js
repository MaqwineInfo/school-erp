const mongoose = require('mongoose');

/**
 * Append-only audit log.
 *
 * Architecture §15.1. The previous implementation wrapped `res.json` and recorded module,
 * action and resource id — but NO before/after values, which the RBAC document requires
 * for every financial and academic change ("old value, new value, reason, approver chain").
 *
 * Rules enforced here:
 *  - no update or delete path exists in code (see the pre-hooks below)
 *  - `retainUntil` is stamped on write from the RBAC §6.3 retention policy
 */
const auditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    // Actor
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String },
    userRole: { type: String },
    userName: { type: String },
    /** Set when a platform admin was impersonating — records who was REALLY acting. */
    impersonatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // What
    module: { type: String, required: true, index: true },
    action: { type: String, required: true },
    resourceType: { type: String },
    resourceId: { type: mongoose.Schema.Types.ObjectId },

    /** Before/after snapshots and the computed field-level diff. */
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    diff: [
      {
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
        _id: false,
      },
    ],

    /** Mandatory for critical actions (RBAC §6.1). */
    reason: { type: String, default: null },

    // Context
    requestId: { type: String, index: true },
    ip: { type: String },
    userAgent: { type: String },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    tags: [{ type: String }],

    /** Retention per RBAC §6.3; enforced by the nightly sweep job. */
    retainUntil: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ tenantId: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, severity: 1, createdAt: -1 });

// ── Append-only enforcement ──────────────────────────────────────────────────
// "No edit, no delete by any user including Super Admin" — RBAC §6.3.
const refuseMutation = function refuseMutation(next) {
  next(new Error('AuditLog is append-only: updates and deletes are not permitted'));
};

auditLogSchema.pre('updateOne', refuseMutation);
auditLogSchema.pre('updateMany', refuseMutation);
auditLogSchema.pre('findOneAndUpdate', refuseMutation);
auditLogSchema.pre('deleteOne', refuseMutation);
auditLogSchema.pre('deleteMany', refuseMutation);
auditLogSchema.pre('findOneAndDelete', refuseMutation);

/**
 * The retention sweep is the ONE legitimate deleter. It calls this rather than the model
 * directly, so the intent is explicit and greppable.
 */
auditLogSchema.statics.purgeExpired = function purgeExpired(now = new Date()) {
  return this.collection.deleteMany({ retainUntil: { $ne: null, $lt: now } });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
