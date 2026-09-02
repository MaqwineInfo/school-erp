const mongoose = require('mongoose');

/**
 * User ⇄ Role binding — the multi-role model.
 *
 * Architecture §7.3 / feature-brainstorm §5.3. The RBAC document requires that "a single
 * user can hold more than one role" and Plan.docx §5.8 models it as `user_roles`; the
 * previous code had neither — the JWT carried one `role` string.
 *
 * A binding may be scoped (this role only for these branches / groups / departments) and
 * time-bounded (which is what makes delegation possible).
 */
const userRoleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    /** Denormalised for fast reads; kept in sync by the identity module. */
    roleSlug: { type: String, required: true },

    /** true for the binding that drives the user's landing page and default portal. */
    isPrimary: { type: Boolean, default: false },

    /** Optional narrowing of this binding below what the role itself grants. */
    scopeFilter: {
      branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
      academicGroupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup' }],
      departmentIds: [{ type: mongoose.Schema.Types.ObjectId }],
      subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    },

    /** Time bounds — a delegation is simply a binding with a validTo. */
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: null },

    /** Set when this binding was created by a delegation rather than an assignment. */
    delegatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userRoleSchema.index({ tenantId: 1, userId: 1, roleId: 1 }, { unique: true });
userRoleSchema.index({ tenantId: 1, roleSlug: 1 });

/** Is this binding in force right now? */
userRoleSchema.methods.isCurrentlyValid = function isCurrentlyValid(at = new Date()) {
  if (!this.isActive) return false;
  if (this.validFrom && at < this.validFrom) return false;
  if (this.validTo && at > this.validTo) return false;
  return true;
};

module.exports = mongoose.model('UserRole', userRoleSchema);
