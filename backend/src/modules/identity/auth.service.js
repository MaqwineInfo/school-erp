/**
 * Authentication service.
 *
 * Closes defect A9. The previous implementation had login, register, me and
 * change-password — and nothing else. Missing entirely: refresh tokens, MFA, forgot/reset
 * password, account lockout, session listing and revocation, and any way to invalidate a
 * live token. `openapi.yaml` documented four of these; Plan.docx §7 specified all of them.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const config = require('../../config/env');
const tokens = require('../../platform/auth/tokens');
const { buildPrincipal } = require('../../platform/auth/principal');
const { buildPermissionMap } = require('../../platform/rbac/permissionResolver');
const { MODULES } = require('../../platform/rbac/actions');
const { record } = require('../../platform/audit/auditLogger');
const {
  UnauthorizedError,
  BadRequestError,
  ForbiddenError,
  BusinessRuleError,
} = require('../../shared/errors');
const logger = require('../../config/logger');

// ── Password policy ──────────────────────────────────────────────────────────

/** Plan.docx §7: ≥8 chars with an upper case letter, a digit and a symbol. */
function validatePassword(password) {
  const problems = [];
  if (!password || password.length < config.auth.passwordMinLength) {
    problems.push(`At least ${config.auth.passwordMinLength} characters`);
  }
  if (!/[A-Z]/.test(password || '')) problems.push('One upper-case letter');
  if (!/[0-9]/.test(password || '')) problems.push('One digit');
  if (!/[^A-Za-z0-9]/.test(password || '')) problems.push('One symbol');
  return { valid: problems.length === 0, problems };
}

function hashPassword(password) {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

// ── Lockout ──────────────────────────────────────────────────────────────────

async function recordAttempt({ email, tenantId, userId, success, reason, req }) {
  const LoginAttempt = mongoose.model('LoginAttempt');
  return LoginAttempt.create({
    email: String(email).toLowerCase(),
    tenantId,
    userId,
    success,
    reason,
    ip: req?.ip,
    userAgent: req?.get?.('User-Agent'),
  }).catch(() => {});
}

/** N failures inside the window locks the account (architecture §14.3). */
async function isLockedOut(email) {
  const LoginAttempt = mongoose.model('LoginAttempt');
  const since = new Date(Date.now() - config.auth.lockoutMinutes * 60 * 1000);

  const failures = await LoginAttempt.countDocuments({
    email: String(email).toLowerCase(),
    success: false,
    attemptedAt: { $gte: since },
  });

  return failures >= config.auth.maxFailedAttempts;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

async function createSession(user, { req, platform = 'web' } = {}) {
  const Session = mongoose.model('Session');
  const { raw, hash } = tokens.generateRefreshToken();

  await Session.create({
    tenantId: user.tenantId,
    userId: user._id,
    tokenHash: hash,
    device: {
      userAgent: req?.get?.('User-Agent'),
      ip: req?.ip,
      platform,
    },
    expiresAt: tokens.refreshExpiryDate(),
  });

  return raw;
}

/** Build the payload the client needs: token, user, permissions, enabled modules. */
async function buildAuthResponse(user, { req, platform } = {}) {
  const Tenant = mongoose.model('Tenant');

  const principal = await buildPrincipal(user);
  const permissionMap = buildPermissionMap(principal, MODULES);

  let enabledModules = [];
  let tenant = null;
  if (user.tenantId) {
    tenant = await Tenant.findById(user.tenantId)
      .select('name slug logo primaryColor secondaryColor enabledModules status settings institutionType')
      .lean();
    enabledModules = tenant?.enabledModules ?? [];
  }

  const accessToken = tokens.signAccessToken(user);
  const refreshToken = await createSession(user, { req, platform });

  const safeUser = { ...user };
  delete safeUser.passwordHash;
  delete safeUser.mfa;

  return {
    token: accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpires,
    user: {
      ...safeUser,
      roles: principal.roles.map((r) => ({ slug: r.slug, name: r.name })),
    },
    permissionMap,
    enabledModules,
    tenant,
  };
}

// ── Login ────────────────────────────────────────────────────────────────────

async function login({ email, password, tenantSlug, mfaCode }, { req } = {}) {
  const User = mongoose.model('User');
  const Tenant = mongoose.model('Tenant');

  if (!email || !password) throw new BadRequestError('Email and password are required');

  if (await isLockedOut(email)) {
    await recordAttempt({ email, success: false, reason: 'locked', req });
    throw new ForbiddenError(
      `Too many failed attempts. Try again in ${config.auth.lockoutMinutes} minutes.`,
    );
  }

  let tenantId = null;
  if (tenantSlug) {
    const tenant = await Tenant.findOne({ slug: tenantSlug, deletedAt: null }).lean();
    if (!tenant) {
      // Never disclose whether a school exists.
      await recordAttempt({ email, success: false, reason: 'unknown_user', req });
      throw new UnauthorizedError('Invalid email or password');
    }
    if (tenant.status === 'suspended') {
      await recordAttempt({ email, tenantId: tenant._id, success: false, reason: 'tenant_suspended', req });
      throw new ForbiddenError('This school account is suspended');
    }
    tenantId = tenant._id;
  }

  const filter = { email: String(email).toLowerCase(), deletedAt: null };
  if (tenantId) filter.tenantId = tenantId;

  const user = await User.findOne(filter).select('+passwordHash +mfa.secret');

  // Identical response for "no such user" and "wrong password" (Plan.docx §7).
  if (!user) {
    await recordAttempt({ email, success: false, reason: 'unknown_user', req });
    throw new UnauthorizedError('Invalid email or password');
  }
  if (!user.isActive) {
    await recordAttempt({ email, tenantId: user.tenantId, userId: user._id, success: false, reason: 'inactive', req });
    throw new ForbiddenError('This account is deactivated. Contact your administrator.');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    await recordAttempt({ email, tenantId: user.tenantId, userId: user._id, success: false, reason: 'bad_password', req });
    throw new UnauthorizedError('Invalid email or password');
  }

  // MFA — tiered by role (RBAC §6.5).
  if (user.mfa?.enabled) {
    if (!mfaCode) {
      return { mfaRequired: true, method: user.mfa.method ?? 'totp', userId: String(user._id) };
    }
    const ok = verifyTotp(user.mfa.secret, mfaCode);
    if (!ok) {
      await recordAttempt({ email, tenantId: user.tenantId, userId: user._id, success: false, reason: 'mfa_failed', req });
      throw new UnauthorizedError('Invalid verification code');
    }
  }

  user.lastLoginAt = new Date();
  user.lockedUntil = null;
  await user.save({ validateBeforeSave: false });

  await recordAttempt({ email, tenantId: user.tenantId, userId: user._id, success: true, reason: 'ok', req });

  record({
    req: { ...req, principal: { userId: user._id, tenantId: user.tenantId, email: user.email, role: user.role } },
    module: 'auth',
    action: 'login',
    resourceType: 'User',
    resourceId: user._id,
  });

  return buildAuthResponse(user.toObject(), { req });
}

// ── Refresh ──────────────────────────────────────────────────────────────────

/**
 * Rotate a refresh token.
 *
 * Reuse detection: presenting a token that has already been rotated means it leaked, so
 * every session for that user is revoked.
 */
async function refresh({ refreshToken }, { req } = {}) {
  const Session = mongoose.model('Session');
  const User = mongoose.model('User');

  if (!refreshToken) throw new UnauthorizedError('Refresh token is required');

  const hash = tokens.hashToken(refreshToken);
  const session = await Session.findOne({ tokenHash: hash });

  if (!session) throw new UnauthorizedError('Invalid refresh token');

  if (session.revokedAt) {
    if (session.revokedReason === 'rotated') {
      logger.warn('Refresh token reuse detected — revoking all sessions', {
        userId: String(session.userId),
      });
      await Session.updateMany(
        { userId: session.userId, revokedAt: null },
        { $set: { revokedAt: new Date(), revokedReason: 'reuse_detected' } },
      );
    }
    throw new UnauthorizedError('This session has ended, please sign in again');
  }

  if (!session.isUsable()) throw new UnauthorizedError('Session expired');

  const user = await User.findOne({ _id: session.userId, deletedAt: null }).lean();
  if (!user || !user.isActive) throw new UnauthorizedError('Account is no longer active');

  // Rotate.
  const next = tokens.generateRefreshToken();
  session.revokedAt = new Date();
  session.revokedReason = 'rotated';
  session.replacedBy = next.hash;
  await session.save();

  await Session.create({
    tenantId: user.tenantId,
    userId: user._id,
    tokenHash: next.hash,
    device: session.device,
    expiresAt: tokens.refreshExpiryDate(),
  });

  return {
    token: tokens.signAccessToken(user),
    refreshToken: next.raw,
    expiresIn: config.jwt.accessExpires,
  };
}

async function logout({ refreshToken }) {
  const Session = mongoose.model('Session');
  if (!refreshToken) return { ok: true };

  await Session.updateOne(
    { tokenHash: tokens.hashToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'logout' } },
  );
  return { ok: true };
}

async function listSessions(userId) {
  const Session = mongoose.model('Session');
  return Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('device createdAt lastUsedAt expiresAt')
    .sort({ createdAt: -1 })
    .lean();
}

async function revokeSession(userId, sessionId) {
  const Session = mongoose.model('Session');
  const res = await Session.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'admin_revoke' } },
  );
  return { revoked: res.modifiedCount > 0 };
}

// ── Password management ──────────────────────────────────────────────────────

/** Bumping tokenVersion invalidates every live access token immediately. */
async function bumpTokenVersion(userId, session) {
  const User = mongoose.model('User');
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }, { session });
}

async function changePassword(userId, { currentPassword, newPassword }, { req } = {}) {
  const User = mongoose.model('User');
  const Session = mongoose.model('Session');

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new UnauthorizedError('User not found');

  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw new UnauthorizedError('Current password is incorrect');

  const check = validatePassword(newPassword);
  if (!check.valid) throw new BusinessRuleError(`Password requirements: ${check.problems.join(', ')}`);

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // invalidate live tokens
  await user.save({ validateBeforeSave: false });

  // Sign the user out everywhere else.
  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'password_change' } },
  );

  record({ req, module: 'auth', action: 'password_changed', resourceType: 'User', resourceId: user._id });

  return { ok: true };
}

/**
 * Start a password reset.
 * Always returns the same shape, so the endpoint cannot be used to enumerate accounts.
 */
async function forgotPassword({ email, tenantSlug }, { req } = {}) {
  const User = mongoose.model('User');
  const Tenant = mongoose.model('Tenant');

  const generic = { ok: true, message: 'If that account exists, a reset link has been sent' };

  let tenantId;
  if (tenantSlug) {
    const tenant = await Tenant.findOne({ slug: tenantSlug, deletedAt: null }).lean();
    if (!tenant) return generic;
    tenantId = tenant._id;
  }

  const user = await User.findOne({
    email: String(email).toLowerCase(),
    deletedAt: null,
    ...(tenantId ? { tenantId } : {}),
  });
  if (!user) return generic;

  const { raw, hash, expiresAt } = tokens.generateOneTimeToken(3600);
  user.passwordResetToken = hash;
  user.passwordResetExpires = expiresAt;
  await user.save({ validateBeforeSave: false });

  // Delivery goes through the communication module; the raw token never persists.
  try {
    const communication = require('../communication');
    const { Scope } = require('../../platform/scope/scope');
    await communication.service.send(
      Scope.system('auth:password_reset', { tenantId: user.tenantId }),
      {
        code: 'PASSWORD_RESET',
        channel: 'email',
        to: user.email,
        recipientName: user.name,
        vars: { name: user.name, token: raw },
        force: true,
      },
    );
  } catch (err) {
    logger.error('Password reset dispatch failed', { error: err.message });
  }

  record({ req, module: 'auth', action: 'password_reset_requested', resourceType: 'User', resourceId: user._id });

  return generic;
}

async function resetPassword({ token, newPassword }, { req } = {}) {
  const User = mongoose.model('User');
  const Session = mongoose.model('Session');

  const check = validatePassword(newPassword);
  if (!check.valid) throw new BusinessRuleError(`Password requirements: ${check.problems.join(', ')}`);

  const user = await User.findOne({
    passwordResetToken: tokens.hashToken(token),
    passwordResetExpires: { $gt: new Date() },
    deletedAt: null,
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new BadRequestError('This reset link is invalid or has expired');

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save({ validateBeforeSave: false });

  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'password_change' } },
  );

  record({ req, module: 'auth', action: 'password_reset', resourceType: 'User', resourceId: user._id });

  return { ok: true };
}

// ── MFA (TOTP, RFC 6238) ─────────────────────────────────────────────────────

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateTotpSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (const b of bytes) out += BASE32[b % 32];
  return out;
}

function base32Decode(input) {
  let bits = '';
  for (const ch of String(input).toUpperCase().replace(/=+$/, '')) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** Standard TOTP — implemented directly to avoid an extra dependency. */
function totpAt(secret, counter) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

/** Accepts the current step plus one either side, for clock drift. */
function verifyTotp(secret, code, { window = 1, at = Date.now() } = {}) {
  if (!secret || !code) return false;
  const step = Math.floor(at / 1000 / 30);
  for (let i = -window; i <= window; i += 1) {
    if (tokens.safeEqual(totpAt(secret, step + i), String(code).trim())) return true;
  }
  return false;
}

async function enrolMfa(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');

  const secret = generateTotpSecret();
  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

  user.mfa = {
    enabled: false, // not active until a code is verified
    method: 'totp',
    secret,
    backupCodes: await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 8))),
  };
  await user.save({ validateBeforeSave: false });

  const label = encodeURIComponent(`SchoolERP:${user.email}`);
  return {
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=SchoolERP`,
    backupCodes, // shown once, never retrievable again
  };
}

async function confirmMfa(userId, code) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).select('+mfa.secret');
  if (!user?.mfa?.secret) throw new BadRequestError('Start MFA enrolment first');

  if (!verifyTotp(user.mfa.secret, code)) throw new UnauthorizedError('Invalid verification code');

  user.mfa.enabled = true;
  user.mfa.enrolledAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { enabled: true };
}

module.exports = {
  login,
  refresh,
  logout,
  listSessions,
  revokeSession,
  changePassword,
  forgotPassword,
  resetPassword,
  enrolMfa,
  confirmMfa,
  verifyTotp,
  totpAt,
  generateTotpSecret,
  validatePassword,
  hashPassword,
  isLockedOut,
  bumpTokenVersion,
  buildAuthResponse,
};
