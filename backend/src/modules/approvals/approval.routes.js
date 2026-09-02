const router = require('express').Router();
const { z } = require('zod');

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const svc = require('./approval.service');
const { sendSuccess, buildPaginationMeta } = require('../../shared/response');

const idParam = { params: schemas.idParam() };

router.use(authenticate);

/** The approver inbox — the primary CTA for Principal and Trustee (RBAC §8.3). */
router.get('/inbox', ...guard('approvals', 'view'), async (req, res) => {
  const { items, total, page, limit } = await svc.inbox(req.scope, req.query);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
});

router.get('/mine', ...guard('approvals', 'view'), async (req, res) => {
  const { items, total, page, limit } = await svc.myRequests(req.scope, req.query);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
});

router.get('/stats', ...guard('approvals', 'view'), async (req, res) => {
  const repoRequests = svc.repos.requests();
  const [pending, approved, rejected] = await Promise.all([
    repoRequests.count(req.scope, { status: 'pending' }),
    repoRequests.count(req.scope, { status: 'approved' }),
    repoRequests.count(req.scope, { status: 'rejected' }),
  ]);
  sendSuccess(res, { pending, approved, rejected });
});

router.get('/:id', ...guard('approvals', 'view'), validate(idParam), async (req, res) => {
  sendSuccess(
    res,
    await svc.repos.requests().findByIdOrFail(req.scope, req.params.id, {
      populate: [
        { path: 'requestedBy', select: 'name email role' },
        { path: 'reviewedBy', select: 'name email role' },
        { path: 'history.actorId', select: 'name role' },
      ],
    }),
  );
});

router.patch(
  '/:id/approve',
  ...guard('approvals', 'approve'),
  validate({ ...idParam, body: z.object({ remarks: z.string().max(1000).optional() }) }),
  audit('approvals', 'approve'),
  async (req, res) => {
    sendSuccess(res, await svc.approve(req.scope, req.params.id, req.body, { req }), 'Approved');
  },
);

router.patch(
  '/:id/reject',
  ...guard('approvals', 'approve'),
  validate({ ...idParam, body: z.object({ reason: z.string().trim().min(1).max(1000) }) }),
  audit('approvals', 'reject', { requireReason: true }),
  async (req, res) => {
    sendSuccess(res, await svc.reject(req.scope, req.params.id, req.body, { req }), 'Rejected');
  },
);

/** Workflow configuration — Settings → Approval Thresholds (RBAC Appendix B). */
router.get('/workflows/all', ...guard('settings', 'view'), async (req, res) => {
  sendSuccess(res, await svc.repos.workflows().find(req.scope, {}, { sort: { key: 1 } }));
});

router.post('/workflows/seed', ...guard('settings', 'edit'), audit('settings', 'seed_workflows'), async (req, res) => {
  sendSuccess(res, await svc.seedWorkflows(req.scope.tenantId, { force: !!req.body?.force }), 'Workflows seeded');
});

module.exports = router;
