const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../shared/errors');

/**
 * Verifies JWT and attaches user info to req.user.
 * Expects: Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    req.tenantId = payload.tenantId || null;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Same as authenticate but doesn't fail if no token — useful for optional auth.
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    req.tenantId = payload.tenantId || null;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

/**
 * Middleware factory: require a specific permission.
 * The permission string must be present in req.user.permissions array.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (req.user.isSuperAdmin) return next();
    if (!req.user.permissions?.includes(permission)) {
      const { ForbiddenError } = require('../shared/errors');
      return next(new ForbiddenError(`Permission required: ${permission}`));
    }
    next();
  };
}

/**
 * Require user to have one of the given roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError('Authentication required'));
    if (req.user.isSuperAdmin) return next();
    const userRoles = req.user.roles || [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      const { ForbiddenError } = require('../shared/errors');
      return next(new ForbiddenError('Insufficient role'));
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, requirePermission, requireRole };
