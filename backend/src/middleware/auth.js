/**
 * Legacy auth middleware — now a thin bridge to the platform layer.
 *
 * The legacy routers still import `authenticate` from here. Rather than maintaining a
 * second, weaker verifier (the old one had no tokenVersion check, so a password change or
 * role revoke did not invalidate a live token), this delegates to
 * `platform/auth/authenticate`, which attaches BOTH `req.principal` (new) and `req.user`
 * (legacy shape).
 *
 * Net effect: every legacy route gains short-lived-token semantics, immediate revocation
 * and multi-role resolution, without any change to the legacy controllers.
 */
const {
  authenticate,
  optionalAuthenticate,
  requireSuperAdmin,
} = require('../platform/auth/authenticate');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors');

/**
 * Legacy helper: does the principal hold a named role?
 * Reads the resolved role bindings rather than the single denormalised string.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const principal = req.principal;
    if (!principal) return next(new UnauthorizedError('Authentication required'));
    if (principal.isSuperAdmin) return next();

    const held = new Set([principal.role, ...(principal.roles ?? []).map((r) => r.slug)]);
    if (!roles.some((r) => held.has(r))) {
      return next(new ForbiddenError('Insufficient role'));
    }
    return next();
  };
}

/** Legacy helper kept for compatibility; prefer checkPermission(module, action). */
function requirePermission(permission) {
  return (req, res, next) => {
    const principal = req.principal;
    if (!principal) return next(new UnauthorizedError('Authentication required'));
    if (principal.isSuperAdmin) return next();

    const [module, action] = String(permission).split(':');
    if (!module || !action) return next(new ForbiddenError(`Malformed permission: ${permission}`));

    const { can } = require('../platform/rbac/permissionResolver');
    if (!can(principal, module, action)) {
      return next(new ForbiddenError(`Permission required: ${permission}`));
    }
    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireSuperAdmin,
  requireRole,
  requirePermission,
};
