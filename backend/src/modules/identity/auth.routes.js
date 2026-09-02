/**
 * Authentication routes.
 *
 * Every endpoint `openapi.yaml` documented but that did not exist now does:
 * /auth/refresh, /auth/logout, /auth/forgot-password, /auth/reset-password,
 * plus MFA and session management from Plan.docx §7.
 */
const router = require('express').Router();
const { z } = require('zod');

const { authenticate } = require('../../platform/auth/authenticate');
const { validate, schemas } = require('../../platform/validation/validate');
const svc = require('./auth.service');
const { sendSuccess } = require('../../shared/response');

const { email, nonEmptyString, objectId } = schemas;

// ── Public ───────────────────────────────────────────────────────────────────

router.post(
  '/login',
  validate({
    body: z.object({
      email: email(),
      password: nonEmptyString(200),
      tenantSlug: z.string().trim().max(60).optional(),
      mfaCode: z.string().trim().max(10).optional(),
    }),
  }),
  async (req, res) => {
    const result = await svc.login(req.body, { req });
    sendSuccess(res, result, result.mfaRequired ? 'Verification code required' : 'Signed in');
  },
);

router.post(
  '/refresh',
  validate({ body: z.object({ refreshToken: nonEmptyString(400) }) }),
  async (req, res) => {
    sendSuccess(res, await svc.refresh(req.body, { req }), 'Token refreshed');
  },
);

router.post(
  '/logout',
  validate({ body: z.object({ refreshToken: z.string().max(400).optional() }) }),
  async (req, res) => {
    sendSuccess(res, await svc.logout(req.body), 'Signed out');
  },
);

router.post(
  '/forgot-password',
  validate({
    body: z.object({ email: email(), tenantSlug: z.string().trim().max(60).optional() }),
  }),
  async (req, res) => {
    // Deliberately identical response whether or not the account exists.
    sendSuccess(res, await svc.forgotPassword(req.body, { req }));
  },
);

router.post(
  '/reset-password',
  validate({ body: z.object({ token: nonEmptyString(400), newPassword: nonEmptyString(200) }) }),
  async (req, res) => {
    sendSuccess(res, await svc.resetPassword(req.body, { req }), 'Password reset');
  },
);

// ── Authenticated ────────────────────────────────────────────────────────────

router.use(authenticate);

router.get('/me', async (req, res) => {
  const User = require('mongoose').model('User');
  const user = await User.findById(req.principal.userId).lean();
  sendSuccess(res, await svc.buildAuthResponse(user, { req }));
});

router.put(
  '/change-password',
  validate({
    body: z.object({ currentPassword: nonEmptyString(200), newPassword: nonEmptyString(200) }),
  }),
  async (req, res) => {
    sendSuccess(res, await svc.changePassword(req.principal.userId, req.body, { req }), 'Password changed');
  },
);

/** Active sessions across devices (wireframe WF-0005). */
router.get('/sessions', async (req, res) => {
  sendSuccess(res, await svc.listSessions(req.principal.userId));
});

router.delete(
  '/sessions/:id',
  validate({ params: z.object({ id: objectId() }) }),
  async (req, res) => {
    sendSuccess(res, await svc.revokeSession(req.principal.userId, req.params.id), 'Session revoked');
  },
);

// ── MFA (RBAC §6.5) ──────────────────────────────────────────────────────────

router.post('/mfa/enrol', async (req, res) => {
  sendSuccess(res, await svc.enrolMfa(req.principal.userId), 'Scan the QR code, then confirm');
});

router.post(
  '/mfa/confirm',
  validate({ body: z.object({ code: nonEmptyString(10) }) }),
  async (req, res) => {
    sendSuccess(res, await svc.confirmMfa(req.principal.userId, req.body.code), 'Two-factor authentication enabled');
  },
);

module.exports = router;
