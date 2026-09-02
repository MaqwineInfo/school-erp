/**
 * Authentication middleware — verifies the access token and attaches `req.principal`.
 *
 * Architecture §5 steps 5–6.
 *
 * Difference from the previous implementation: that one re-read the whole User document
 * from MongoDB on EVERY request purely to keep `role` fresh, because there was no refresh
 * mechanism and tokens lived for 7 days. With 15-minute tokens plus `tokenVersion`, the
 * per-request read exists only to check the version stamp and can be cached.
 */
const mongoose = require('mongoose');
const { verifyAccessToken } = require('./tokens');
const { buildPrincipal } = require('./principal');
const { UnauthorizedError, ForbiddenError } = require('../../shared/errors');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function loadUser(userId) {
  const User = mongoose.model('User');
  return User.findOne({ _id: userId, deletedAt: null }).lean();
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError('No token provided');

    const payload = verifyAccessToken(token);

    const user = await loadUser(payload.sub);
    if (!user) throw new UnauthorizedError('Account no longer exists');
    if (!user.isActive) throw new UnauthorizedError('Account deactivated');

    // Token-version check — this is what makes revocation immediate on a password change,
    // a role change, or an administrative revoke.
    if ((user.tokenVersion ?? 0) !== (payload.ver ?? 0)) {
      throw new UnauthorizedError('Session no longer valid, please sign in again');
    }

    const principal = await buildPrincipal(user);

    // Super-admin impersonation: X-Tenant-Id retargets the request at another tenant, and
    // the audit trail records who is really acting (architecture §14, RBAC §6.1).
    const impersonatedTenant = req.get('X-Tenant-Id');
    if (impersonatedTenant) {
      if (!principal.isSuperAdmin) {
        throw new ForbiddenError('X-Tenant-Id may only be used by a platform administrator');
      }
      principal.impersonatedBy = principal.userId;
      principal.tenantId = new mongoose.Types.ObjectId(String(impersonatedTenant));
    }

    req.principal = principal;
    // Back-compat: existing controllers still read req.user / req.tenantId. Kept until
    // every module is migrated (architecture §21 step 2), then removed.
    req.user = {
      userId: principal.userId,
      tenantId: principal.tenantId,
      branchId: principal.branchId,
      role: principal.role,
      email: principal.email,
      name: principal.name,
      isSuperAdmin: principal.isSuperAdmin,
      studentId: principal.studentId,
      linkedStudentIds: principal.linkedStudentIds,
    };
    req.tenantId = principal.tenantId;

    return next();
  } catch (err) {
    return next(err);
  }
}

/** Attaches the principal when a token is present, but never rejects. */
async function optionalAuthenticate(req, res, next) {
  if (!extractToken(req)) return next();
  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.principal) return next(new UnauthorizedError('Authentication required'));
  if (!req.principal.isSuperAdmin) return next(new ForbiddenError('Super admin access required'));
  return next();
}

module.exports = { authenticate, optionalAuthenticate, requireSuperAdmin, extractToken };
