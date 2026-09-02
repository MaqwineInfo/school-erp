const mongoose = require('mongoose');

/**
 * A refresh-token session — one per device.
 *
 * Architecture §14.1. Enables: rotating refresh tokens, the session list (WF-0005),
 * per-device revocation, and "new device login" alerts. None of this existed; the previous
 * implementation issued a single 7-day access token with no revocation path at all.
 *
 * The raw refresh token is NEVER stored — only a SHA-256 hash of it.
 */
const sessionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    tokenHash: { type: String, required: true, index: true },
    /** Set when this session is rotated, so token reuse can be detected. */
    replacedBy: { type: String, default: null },

    device: {
      userAgent: { type: String },
      ip: { type: String },
      platform: { type: String, enum: ['web', 'android', 'ios', 'unknown'], default: 'unknown' },
      label: { type: String },
    },

    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: ['logout', 'rotated', 'reuse_detected', 'admin_revoke', 'password_change', 'role_change', null],
      default: null,
    },
  },
  { timestamps: true },
);

// Expired sessions clean themselves up.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1 });

sessionSchema.methods.isUsable = function isUsable(at = new Date()) {
  return !this.revokedAt && this.expiresAt > at;
};

module.exports = mongoose.model('Session', sessionSchema);
