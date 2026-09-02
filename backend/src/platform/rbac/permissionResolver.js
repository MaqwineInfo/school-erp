/**
 * Permission resolution, including multi-role.
 *
 * Architecture §7.3 — implements the RBAC document's multi-role resolution rule:
 *   - additive actions (view/add/edit/approve/export) → UNION, most permissive wins
 *   - delete on a sensitive module                    → INTERSECTION, most restrictive wins
 *   - each scope dimension                            → WIDEST wins
 *
 * The previous implementation had no multi-role support at all: the JWT carried a single
 * `role` string and `Permission.findOne({ role, module })` was the whole story.
 */
const { EMPTY_PERMISSION, SENSITIVE_MODULES, ACTION_FIELD } = require('./actions');
const { widest } = require('../scope/scope');
const { rbacCache } = require('../../infra/cache/versionedCache');

/**
 * Merge N permission objects for ONE module into a single effective permission.
 * @param {object[]} perms
 * @param {string} module
 */
function mergePermissions(perms, module) {
  const list = (perms || []).filter(Boolean);
  if (!list.length) return { ...EMPTY_PERMISSION };

  const isSensitive = SENSITIVE_MODULES.includes(module);

  const effective = {
    canView: list.some((p) => p.canView),
    canAdd: list.some((p) => p.canAdd),
    canEdit: list.some((p) => p.canEdit),
    canApprove: list.some((p) => p.canApprove),
    canExport: list.some((p) => p.canExport),

    // The one intersection rule. On Fees / Payroll / Examinations / Certificates, holding
    // any role that cannot delete removes the ability entirely.
    canDelete: isSensitive ? list.every((p) => p.canDelete) : list.some((p) => p.canDelete),

    branchScope: widest.branchScope(list.map((p) => p.branchScope)),
    dataScope: widest.dataScope(list.map((p) => p.dataScope)),
    studentScope: widest.studentScope(list.map((p) => p.studentScope)),
    temporalScope: list.some((p) => p.temporalScope === 'all_years')
      ? 'all_years'
      : list.some((p) => p.temporalScope === 'historical_read')
        ? 'historical_read'
        : 'current_ay',
  };

  // Scope dimensions only mean something when at least one action is granted.
  const anyAction = Object.keys(ACTION_FIELD).some((a) => effective[ACTION_FIELD[a]]);
  if (!anyAction) return { ...EMPTY_PERMISSION };

  return effective;
}

/**
 * Effective permission for a principal on a module.
 * @param {object} principal  { tenantId, roles: [{ slug, permissions }] , isSuperAdmin }
 * @param {string} module
 */
function resolve(principal, module) {
  if (!principal) return { ...EMPTY_PERMISSION };

  const roles = principal.roles || [];
  if (!roles.length) return { ...EMPTY_PERMISSION };

  const perms = roles.map((r) => r.permissions?.[module]).filter(Boolean);
  return mergePermissions(perms, module);
}

/** Does this principal hold `action` on `module`? */
function can(principal, module, action) {
  const field = ACTION_FIELD[action];
  if (!field) throw new Error(`Unknown action "${action}"`);
  return !!resolve(principal, module)[field];
}

/**
 * The full module → permission map handed to the frontend at login.
 * Only modules with at least `view` are included, so the client's `permissionMap` is a
 * faithful mirror of what the API will actually allow.
 */
function buildPermissionMap(principal, modules) {
  const map = {};
  for (const m of modules) {
    const p = resolve(principal, m);
    if (p.canView || p.canAdd || p.canEdit || p.canDelete || p.canApprove || p.canExport) {
      map[m] = p;
    }
  }
  return map;
}

/** Cache key namespace for one tenant's RBAC data. */
const ns = (tenantId) => `rbac:${tenantId ?? 'global'}`;

/** Invalidate a tenant's RBAC cache immediately after a role or permission write. */
function invalidateTenant(tenantId) {
  rbacCache.bump(ns(tenantId));
}

module.exports = {
  mergePermissions,
  resolve,
  can,
  buildPermissionMap,
  invalidateTenant,
  ns,
};
