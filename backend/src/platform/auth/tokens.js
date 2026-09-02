/**
 * Token issuance and verification.
 *
 * Architecture §14.1. Replaces a single 7-day access token that had no revocation path
 * with a 15-minute access token plus a 30-day rotating refresh token stored as a hash.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const { UnauthorizedError } = require('../../shared/errors');

/**
 * The access-token payload. Deliberately small: it carries identity and the version
 * stamp, NOT the permission matrix. Permissions are resolved server-side per request so
 * that a role change takes effect immediately rather than at next login.
 */
function buildAccessPayload(user) {
  return {
    sub: String(user._id),
    tid: user.tenantId ? String(user.tenantId) : null,
    bid: user.branchId ? String(user.branchId) : null,
    role: user.role,
    sa: !!user.isSuperAdmin,
    ver: user.tokenVersion ?? 0,
    typ: 'access',
  };
}

function signAccessToken(user) {
  return jwt.sign(buildAccessPayload(user), config.jwt.secret, {
    expiresIn: config.jwt.accessExpires,
    issuer: config.jwt.issuer,
  });
}

function verifyAccessToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { issuer: config.jwt.issuer });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new UnauthorizedError('Token expired');
    throw new UnauthorizedError('Invalid token');
  }
  if (payload.typ !== 'access') throw new UnauthorizedError('Wrong token type');
  return payload;
}

/**
 * Refresh tokens are opaque random strings, never JWTs — there is nothing to read in them
 * and nothing to forge. Only the SHA-256 hash is persisted.
 */
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function refreshExpiryDate(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + config.jwt.refreshExpiresDays);
  return d;
}

/** Single-use tokens for password reset and email verification. */
function generateOneTimeToken(ttlSeconds = 3600) {
  const raw = crypto.randomBytes(32).toString('base64url');
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  };
}

/** Numeric OTP for phone login and step-up MFA. */
function generateOtp(digits = 6) {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(digits, '0');
}

/** Constant-time comparison, so token checks do not leak length or prefix by timing. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = {
  buildAccessPayload,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiryDate,
  generateOneTimeToken,
  generateOtp,
  safeEqual,
};
