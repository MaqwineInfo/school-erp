const router = require('express').Router();
const { z } = require('zod');

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const svc = require('./communication.service');
const { seedTemplates } = require('./defaultTemplates');
const { sendSuccess, sendCreated, buildPaginationMeta, parsePagination } = require('../../shared/response');

const { objectId, nonEmptyString, isoDate } = schemas;

router.use(authenticate);

// ── Templates ────────────────────────────────────────────────────────────────
router.get('/templates', ...guard('communication', 'view'), async (req, res) => {
  sendSuccess(res, await svc.repos.templates().find(req.scope, {}, { sort: { code: 1 } }));
});

router.post(
  '/templates',
  ...guard('communication', 'edit'),
  validate({
    body: z.object({
      code: nonEmptyString(60),
      name: nonEmptyString(120),
      channel: z.enum(['sms', 'whatsapp', 'email', 'push', 'in_app']),
      language: z.string().max(5).default('en'),
      subject: z.string().max(200).optional(),
      body: nonEmptyString(2000),
      dltTemplateId: z.string().max(60).optional(),
      dltEntityId: z.string().max(60).optional(),
      whatsappTemplateName: z.string().max(120).optional(),
      isTransactional: z.boolean().default(true),
      isCritical: z.boolean().default(false),
    }),
  }),
  audit('communication', 'create_template'),
  async (req, res) => {
    sendCreated(res, await svc.repos.templates().create(req.scope, req.body), 'Template created');
  },
);

router.post(
  '/templates/seed',
  ...guard('communication', 'edit'),
  audit('communication', 'seed_templates'),
  async (req, res) => {
    sendSuccess(res, await seedTemplates(req.scope.tenantId, { force: !!req.body?.force }), 'Templates seeded');
  },
);

// ── Sending ──────────────────────────────────────────────────────────────────
router.post(
  '/send',
  ...guard('communication', 'add'),
  validate({
    body: z.object({
      code: nonEmptyString(60),
      channel: z.enum(['sms', 'whatsapp', 'email', 'push', 'in_app']),
      to: nonEmptyString(120),
      recipientName: z.string().max(120).optional(),
      studentId: objectId().optional(),
      vars: z.record(z.string(), z.any()).default({}),
      language: z.string().max(5).default('en'),
    }),
  }),
  audit('communication', 'send'),
  async (req, res) => {
    sendSuccess(res, await svc.send(req.scope, req.body), 'Message queued');
  },
);

/**
 * Bulk broadcast. RBAC §6.4 makes a school-wide send a Principal-approved action with a
 * preview, so this needs `approve`, not merely `add`.
 */
router.post(
  '/broadcast',
  ...guard('communication', 'approve'),
  validate({
    body: z.object({
      code: nonEmptyString(60),
      channel: z.enum(['sms', 'whatsapp', 'email', 'push']),
      recipients: z
        .array(
          z.object({
            to: nonEmptyString(120),
            name: z.string().max(120).optional(),
            studentId: objectId().optional(),
            vars: z.record(z.string(), z.any()).optional(),
          }),
        )
        .min(1)
        .max(5000),
      vars: z.record(z.string(), z.any()).default({}),
      approved: z.boolean().default(false),
    }),
  }),
  audit('communication', 'broadcast'),
  async (req, res) => {
    sendSuccess(res, await svc.broadcast(req.scope, req.body), 'Broadcast processed');
  },
);

// ── Reporting ────────────────────────────────────────────────────────────────
router.get('/notifications', ...guard('communication', 'view'), async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const criteria = {};
  if (req.query.channel) criteria.channel = req.query.channel;
  if (req.query.status) criteria.status = req.query.status;

  const { items, total } = await svc.repos.notifications().paginate(req.scope, criteria, {
    page,
    limit,
    sort: { createdAt: -1 },
  });
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
});

router.get(
  '/delivery-report',
  ...guard('communication', 'view'),
  validate({ query: z.object({ from: isoDate(), to: isoDate() }) }),
  async (req, res) => {
    sendSuccess(res, await svc.deliveryReport(req.scope, req.query));
  },
);

module.exports = router;
