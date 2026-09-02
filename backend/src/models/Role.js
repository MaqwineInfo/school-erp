const mongoose = require('mongoose');
const { MODULES, BRANCH_SCOPES, DATA_SCOPES, STUDENT_SCOPES, TEMPORAL_SCOPES } = require('../platform/rbac/actions');

/**
 * A role and its full permission matrix.
 *
 * Architecture §7.2 / ADR-05. This model is now the SINGLE source of permissions, merging
 * the two systems that previously coexisted and disagreed:
 *   - `Permission` (role-string × module, seeded globally, actions view/add/edit/...)
 *   - `Role`       (per-tenant, `permissions[{module, actions[]}]`, action named `create`)
 * which is exactly why `frontend/src/config/moduleAliases.ts` had to exist.
 *
 * `Permission` is retained only as the seed definition for the 12 system roles.
 *
 * Three kinds of role live here:
 *   - system    (tenantId: null, isSystem: true)  — the 12, not deletable
 *   - template  (per tenant, isTemplate: true)    — the ~23 pre-built, fully editable
 *   - custom    (per tenant)                      — cloned and edited by the school
 */

const modulePermissionSchema = new mongoose.Schema(
  {
    canView: { type: Boolean, default: false },
    canAdd: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canApprove: { type: Boolean, default: false },
    canExport: { type: Boolean, default: false },

    branchScope: { type: String, enum: BRANCH_SCOPES, default: 'own_branch' },
    dataScope: { type: String, enum: DATA_SCOPES, default: 'school' },
    studentScope: { type: String, enum: STUDENT_SCOPES, default: 'all' },
    /** RBAC scope dimension #4 — specified in the doc, previously missing from the model. */
    temporalScope: { type: String, enum: TEMPORAL_SCOPES, default: 'current_ay' },
  },
  { _id: false },
);

const roleSchema = new mongoose.Schema(
  {
    /** null = a global system role shared by every tenant. */
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String },
    tier: {
      type: String,
      enum: ['platform', 'tenant', 'group', 'branch', 'department', 'functional', 'operational', 'field', 'portal'],
      default: 'operational',
    },

    /** One of the 12 built-ins — cannot be deleted or have its slug changed. */
    isSystem: { type: Boolean, default: false },
    /** Pre-seeded from the RBAC document; fully editable and deletable. */
    isTemplate: { type: Boolean, default: false },
    /** The slug this role was cloned from, for provenance. */
    clonedFrom: { type: String, default: null },

    /** module key → permission. A Map keeps it queryable and avoids a 31-field object. */
    matrix: {
      type: Map,
      of: modulePermissionSchema,
      default: () => new Map(),
    },

    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

roleSchema.index({ tenantId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
roleSchema.index({ isSystem: 1 });

/** Permission for one module as a plain object, never undefined. */
roleSchema.methods.permissionFor = function permissionFor(module) {
  const p = this.matrix?.get?.(module);
  return p ? (p.toObject ? p.toObject() : p) : null;
};

/** The whole matrix as a plain object — what the resolver and the frontend consume. */
roleSchema.methods.toMatrixObject = function toMatrixObject() {
  const out = {};
  for (const m of MODULES) {
    const p = this.permissionFor(m);
    if (p) out[m] = p;
  }
  return out;
};

roleSchema.statics.MODULES = MODULES;

module.exports = mongoose.model('Role', roleSchema);
