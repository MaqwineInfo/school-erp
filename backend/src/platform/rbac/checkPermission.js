/**
 * The route-level permission gate.
 *
 * Architecture §5 steps 7–8. Unlike the previous version, this does not just answer
 * yes/no — it resolves the effective scope and attaches `req.scope`, which is the object
 * every repository requires. That is what makes it impossible for a controller to skip
 * data scoping: the gate produces the only key that opens the data layer.
 */
const { resolve } = require('./permissionResolver');
const { MODULE_TO_PLAN_SLUG, ACTION_FIELD } = require('./actions');
const { resolveScope, applyRequestNarrowing } = require('../scope/scopeEngine');
const { createAssignmentProvider } = require('../scope/assignmentProvider');
const { Scope } = require('../scope/scope');
const {
  UnauthorizedError,
  ForbiddenError,
  ModuleDisabledError,
} = require('../../shared/errors');
const { tenantCache } = require('../../infra/cache/versionedCache');

/** Modules a tenant always has, regardless of plan. */
async function tenantEnabledModules(tenantId) {
  if (!tenantId) return null;
  return tenantCache.wrap('tenant:modules', String(tenantId), async () => {
    const mongoose = require('mongoose');
    const Tenant = mongoose.model('Tenant');
    const t = await Tenant.findById(tenantId).select('enabledModules status').lean();
    return t ? { modules: t.enabledModules || [], status: t.status } : null;
  });
}

/**
 * requireModule(module) — 403 MODULE_DISABLED when the tenant's plan excludes it.
 * Distinct from FORBIDDEN on purpose: the UI renders a different state (WF-0281).
 */
function requireModule(module) {
  return async (req, res, next) => {
    try {
      const planSlug = MODULE_TO_PLAN_SLUG[module];
      if (!planSlug) return next(); // always-on module

      const principal = req.principal;
      if (!principal) throw new UnauthorizedError('Authentication required');
      if (principal.isSuperAdmin) return next();

      const tenant = await tenantEnabledModules(principal.tenantId);
      if (!tenant) return next();

      // Fail CLOSED. The frontend store previously did the opposite — `hasModule`
      // returned true when enabledModules was empty, so a misconfigured tenant saw
      // everything (feature-brainstorm §8.11).
      const enabled = tenant.modules || [];
      if (!enabled.includes(planSlug)) throw new ModuleDisabledError(module);

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * checkPermission(module, action)
 *
 * On success attaches:
 *   req.permission — the merged effective permission across all the user's roles
 *   req.scope      — the resolved Scope, required by every repository call
 */
function checkPermission(module, action) {
  if (!ACTION_FIELD[action]) throw new Error(`checkPermission: unknown action "${action}"`);

  return async (req, res, next) => {
    try {
      const principal = req.principal;
      if (!principal) throw new UnauthorizedError('Authentication required');

      // Platform administrators bypass the module gate but still receive a real Scope,
      // so their queries remain explicit rather than unfiltered.
      if (principal.isSuperAdmin) {
        req.permission = {
          canView: true, canAdd: true, canEdit: true,
          canDelete: true, canApprove: true, canExport: true,
          branchScope: 'all_branches', dataScope: 'group',
          studentScope: 'all', temporalScope: 'all_years',
        };
        req.scope = applyRequestNarrowing(
          new Scope({
            tenantId: principal.tenantId,
            userId: principal.userId,
            dataScope: 'group',
            module,
            action,
          }),
          req,
        );
        return next();
      }

      const permission = resolve(principal, module);

      if (!permission[ACTION_FIELD[action]]) {
        throw new ForbiddenError(
          `You do not have permission to ${action} ${module.replace(/_/g, ' ')}`,
        );
      }

      const provider = req.assignmentProvider || createAssignmentProvider();
      req.assignmentProvider = provider; // reused across middlewares in one request

      const scope = await resolveScope(principal, permission, { module, action, provider });

      req.permission = permission;
      req.scope = applyRequestNarrowing(scope, req);

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Convenience: module gate + permission gate in one call, which is what a route almost
 * always wants.
 *
 *   router.get('/', ...guard('fees', 'view'), ctrl.list)
 */
function guard(module, action) {
  return [requireModule(module), checkPermission(module, action)];
}

/** Invalidate the tenant module cache after a plan or module-toggle change. */
function invalidateTenantModules() {
  tenantCache.bump('tenant:modules');
}

module.exports = { checkPermission, requireModule, guard, invalidateTenantModules };
