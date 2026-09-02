/**
 * Builds `req.principal` — the authenticated actor plus every role they hold.
 *
 * Architecture §5 step 5. This is what makes multi-role work: instead of a single `role`
 * string, the principal carries an array of roles each with its full permission matrix,
 * which the resolver then merges per module (§7.3).
 */
const mongoose = require('mongoose');
const { rbacCache } = require('../../infra/cache/versionedCache');
const { ns } = require('../rbac/permissionResolver');

/**
 * Load the Role documents for a user, cached per tenant and invalidated by version bump.
 * @returns {Promise<Array<{ roleId, slug, name, isSuperAdmin, permissions, scopeFilter }>>}
 */
async function loadRoles(user) {
  const UserRole = mongoose.model('UserRole');
  const Role = mongoose.model('Role');

  const now = new Date();
  const bindings = await UserRole.find({
    userId: user._id,
    isActive: true,
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
      { $or: [{ validTo: null }, { validTo: { $gte: now } }] },
    ],
  }).lean();

  // Fall back to the denormalised primary role for users who predate the binding model.
  // The Phase-0 migration creates bindings for everyone; this keeps the app working in
  // between, rather than silently locking legacy users out.
  const slugs = bindings.length ? bindings.map((b) => b.roleSlug) : [user.role].filter(Boolean);
  if (!slugs.length) return [];

  const namespace = ns(user.tenantId);

  const roles = await Promise.all(
    slugs.map((slug) =>
      rbacCache.wrap(namespace, slug, async () => {
        const doc = await Role.findOne({
          slug,
          isActive: true,
          deletedAt: null,
          $or: [{ tenantId: user.tenantId }, { tenantId: null }],
        })
          // A tenant-specific override of a system role wins over the global one.
          .sort({ tenantId: -1 })
          .lean();

        if (!doc) return null;
        return {
          roleId: doc._id,
          slug: doc.slug,
          name: doc.name,
          isSuperAdmin: !!doc.isSuperAdmin,
          permissions: matrixToObject(doc.matrix),
        };
      }),
    ),
  );

  const found = roles.filter(Boolean);

  // Re-attach each binding's optional narrowing filter.
  return found.map((r) => {
    const binding = bindings.find((b) => b.roleSlug === r.slug);
    return binding ? { ...r, scopeFilter: binding.scopeFilter, isPrimary: binding.isPrimary } : r;
  });
}

/** A lean() Map field comes back as a plain object; a hydrated one does not. */
function matrixToObject(matrix) {
  if (!matrix) return {};
  if (matrix instanceof Map) return Object.fromEntries(matrix);
  return matrix;
}

/**
 * Assemble the principal from a user document.
 * @param {object} user a lean User document
 */
async function buildPrincipal(user) {
  const roles = await loadRoles(user);

  return {
    userId: user._id,
    tenantId: user.tenantId ?? null,
    branchId: user.branchId ?? null,
    assignedBranchIds: user.assignedBranchIds ?? [],
    departmentIds: user.departmentIds ?? [],

    email: user.email,
    name: user.name,
    role: user.role, // primary, for UI routing only
    roles, // authoritative, for permission resolution
    isSuperAdmin: !!user.isSuperAdmin || roles.some((r) => r.isSuperAdmin),

    studentId: user.studentId ?? null,
    linkedStudentIds: user.linkedStudentIds ?? [],

    tokenVersion: user.tokenVersion ?? 0,
    mfaEnabled: !!user.mfa?.enabled,
    locale: user.locale ?? 'en',

    /** Set by the impersonation flow so the audit trail records who is really acting. */
    impersonatedBy: null,
  };
}

module.exports = { buildPrincipal, loadRoles };
