const mongoose = require('mongoose');

/**
 * Failed/successful login tracking for lockout and audit.
 * Architecture §14.3 — 5 failed attempts triggers a 15-minute lockout, and every attempt
 * is retained for 1 year per the RBAC document's authentication retention rule.
 */
const loginAttemptSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    success: { type: Boolean, required: true },
    reason: {
      type: String,
      enum: ['ok', 'bad_password', 'unknown_user', 'inactive', 'locked', 'mfa_failed', 'tenant_suspended'],
      default: 'ok',
    },
    ip: { type: String },
    userAgent: { type: String },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

loginAttemptSchema.index({ email: 1, attemptedAt: -1 });
// Retention: 1 year (RBAC §6.3).
loginAttemptSchema.index({ attemptedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
