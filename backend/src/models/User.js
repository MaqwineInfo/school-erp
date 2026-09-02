const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * A user account.
 *
 * Corrections from the previous version:
 *  1. `role` is no longer an enum, and no longer the source of permissions. It is a
 *     DENORMALISED pointer to the user's primary role slug, used for the landing page and
 *     portal selection. The authoritative source is the `UserRole` binding collection
 *     (architecture §7.2, Plan.docx §5.8).
 *
 *     This is what fixes the `school_owner` hole: previously `User.role` accepted
 *     `school_owner` while `Permission.role`'s enum did not and no rows were seeded, so
 *     that user was 403'd on every module and saw an empty sidebar. Now every role —
 *     system, template or custom — is a Role document reachable through a binding, so a
 *     role that a user can hold is necessarily a role that has permissions.
 *
 *  2. Additive fields for auth v2 (tokenVersion, mfa, lockout) and for the scope engine
 *     (assignedBranchIds, departmentIds).
 */
const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },

    /**
     * Denormalised primary role slug — drives the landing dashboard and portal nav only.
     * NOT the permission source: that is the UserRole binding set. Deliberately un-enumed
     * so system, template and custom role slugs are all valid; referential integrity is
     * enforced by the identity module against the Role collection.
     */
    role: { type: String, default: 'teacher', index: true },

    /** Scope inputs (architecture §6.2). */
    assignedBranchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    departmentIds: [{ type: mongoose.Schema.Types.ObjectId }],

    /** Portal links. */
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    linkedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    photo: { type: String },
    locale: { type: String, default: 'en' },

    // ── Auth v2 (architecture §14) ────────────────────────────────────────────
    /** Bumped on password change, role change or admin revoke — invalidates live tokens. */
    tokenVersion: { type: Number, default: 0 },

    mfa: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['totp', 'sms', null], default: null },
      secret: { type: String, select: false },
      backupCodes: { type: [String], select: false, default: [] },
      enrolledAt: { type: Date },
    },

    /** Populated by the lockout guard; cleared on a successful login. */
    lockedUntil: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },

    lastLoginAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1, tenantId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
userSchema.index({ tenantId: 1, role: 1 });

userSchema.methods.comparePassword = async function comparePassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isLocked = function isLocked(at = new Date()) {
  return !!this.lockedUntil && this.lockedUntil > at;
};

module.exports = mongoose.model('User', userSchema);
