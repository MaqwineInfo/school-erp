/**
 * Legacy RBAC middleware — bridged to the platform permission model.
 *
 * WHY THIS EXISTS IN THIS FORM
 * The legacy routers call `checkPermission(module, action)` from here. The original
 * implementation read the `Permission` collection (role-string × module). ADR-05 made the
 * `Role` collection the single source and `seed-rbac.js` no longer writes `Permission`
 * rows — so after the RBAC migration this middleware found nothing and returned
 * "no permissions found for role X" on EVERY legacy route.
 *
 * It now resolves through `platform/rbac/permissionResolver` exactly like the new
 * `guard()` does, and falls back to the legacy collection only for a principal that has
 * no role bindings yet (a database migrated half-way).
 *
 * What it still does NOT do is apply data scoping — legacy controllers build their own
 * `{ tenantId }` filters. That is the whole point of porting a module: `req.scope` is
 * attached here, but only a repository call actually enforces it.
 */
const Permission = require('../models/Permission');
const { resolve } = require('../platform/rbac/permissionResolver');
const { requireModule } = require('../platform/rbac/checkPermission');
const { ACTION_FIELD } = require('../platform/rbac/actions');
const { resolveScope } = require('../platform/scope/scopeEngine');
const { createAssignmentProvider } = require('../platform/scope/assignmentProvider');
const { record } = require('../platform/audit/auditLogger');
const { UnauthorizedError, ForbiddenError, BadRequestError } = require('../shared/errors');

/** Transitional fallback for principals with no role bindings. */
const legacyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function legacyPermission(role, module) {
  const key = `${role}:${module}`;
  const cached = legacyCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const perm = await Permission.findOne({ role, module }).lean();
  legacyCache.set(key, { data: perm, ts: Date.now() });
  return perm;
}

function clearPermissionCache() {
  legacyCache.clear();
}

/**
 * checkPermission(module, action)
 * Attaches `req.permission` and `req.scope` on success, matching the new `guard()`.
 *
 * It ALSO performs the module (plan) check. In the new layer that is a separate
 * `requireModule` middleware composed by `guard()`, but legacy routes only ever call
 * `checkPermission` — so without this, a tenant whose plan excludes Library still got a
 * 200 from `/library/books`. Folding the check in here gives every legacy route plan
 * gating for free, and returns MODULE_DISABLED rather than FORBIDDEN so the UI can tell
 * "not purchased" from "not permitted" (wireframe WF-0281).
 */
function checkPermission(module, action) {
  const moduleGate = requireModule(module);

  return async (req, res, next) => {
    try {
      const principal = req.principal;
      if (!principal) return next(new UnauthorizedError('Authentication required'));

      const field = ACTION_FIELD[action];
      if (!field) return next(new BadRequestError(`Unknown action: ${action}`));

      // Plan gating first, so a disabled module never leaks a permission decision.
      const gateError = await new Promise((resolve_) => moduleGate(req, res, resolve_));
      if (gateError) return next(gateError);

      if (principal.isSuperAdmin) {
        req.permission = {
          canView: true, canAdd: true, canEdit: true,
          canDelete: true, canApprove: true, canExport: true,
          branchScope: 'all_branches', dataScope: 'group',
          studentScope: 'all', temporalScope: 'all_years',
        };
        req.rbacScope = { branchScope: 'all_branches', dataScope: 'group', studentScope: 'all' };
        return next();
      }

      let permission = resolve(principal, module);

      // Half-migrated database: no bindings, so consult the old collection.
      if (!principal.roles?.length) {
        const legacy = await legacyPermission(principal.role, module);
        if (legacy) permission = legacy;
      }

      if (!permission?.[field]) {
        return next(
          new ForbiddenError(
            `You do not have permission to ${action} ${module.replace(/_/g, ' ')}`,
          ),
        );
      }

      const provider = req.assignmentProvider || createAssignmentProvider();
      req.assignmentProvider = provider;

      req.permission = permission;
      req.scope = await resolveScope(principal, permission, { module, action, provider });

      // Legacy shape, still read by some controllers.
      req.rbacScope = {
        branchScope: permission.branchScope,
        dataScope: permission.dataScope,
        studentScope: permission.studentScope,
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * applyBranchScope — legacy `req.branchFilter`.
 *
 * The previous version decided all-branch access with `['trustee'].includes(user.role)`,
 * a role string that existed in no enum, so the branch was ALWAYS pinned for everyone
 * except super admins. It is now derived from the principal's actual permissions.
 */
function applyBranchScope(req, res, next) {
  const principal = req.principal;
  if (!principal) return next();

  const grantsAllBranches =
    principal.isSuperAdmin ||
    (principal.roles ?? []).some((r) =>
      Object.values(r.permissions ?? {}).some((p) => p.branchScope === 'all_branches'),
    );

  req.branchFilter = grantsAllBranches
    ? { tenantId: principal.tenantId }
    : {
        tenantId: principal.tenantId,
        ...(principal.branchId ? { branchId: principal.branchId } : {}),
      };

  return next();
}

/**
 * audit(module, action) — delegates to the platform audit writer so legacy routes get the
 * same retention, redaction and severity rules as the new modules.
 */
function audit(module, action, getSeverity) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        record({
          req,
          module,
          action,
          resourceType: module,
          resourceId: req.params?.id ?? body?.data?._id ?? null,
          after: body?.data ?? null,
          before: req.auditBefore ?? null,
          reason: req.body?.reason ?? null,
        });
      }
      return originalJson(body);
    };

    // `getSeverity` was a per-route override; severity is now derived centrally from the
    // CRITICAL_ACTIONS set. Accepted and ignored so legacy call sites keep working.
    void getSeverity;
    return next();
  };
}

module.exports = { checkPermission, applyBranchScope, audit, clearPermissionCache };
