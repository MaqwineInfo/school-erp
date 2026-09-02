/**
 * Fees routes.
 *
 * Note the permission split, which mirrors RBAC §2.16: a Cashier holds `fees:add` only,
 * so they can collect at the counter but cannot touch a structure (`edit`) or grant a
 * waiver (`approve`). Structure reads require `edit` deliberately — a fee schedule is
 * management information, not counter information.
 */
const router = require('express').Router();

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const { idempotent } = require('../../platform/idempotency/idempotency');
const S = require('./fee.schema');
const ctrl = require('./fee.controller');

const idParam = { params: schemas.idParam() };

router.use(authenticate);

// ── Fee heads ────────────────────────────────────────────────────────────────
router.get('/heads', ...guard('fees', 'view'), ctrl.listHeads);
router.post(
  '/heads',
  ...guard('fees', 'edit'),
  validate({ body: S.createHead }),
  audit('fees', 'create_head'),
  ctrl.createHead,
);

// ── Structures — management only ─────────────────────────────────────────────
router.get('/structures', ...guard('fees', 'edit'), ctrl.listStructures);
router.post(
  '/structures',
  ...guard('fees', 'edit'),
  validate({ body: S.createStructure }),
  audit('fees', 'structure_edit', { requireReason: false }),
  ctrl.createStructure,
);
router.put(
  '/structures/:id',
  ...guard('fees', 'edit'),
  validate({ ...idParam, body: S.updateStructure }),
  audit('fees', 'structure_edit'),
  ctrl.updateStructure,
);

// ── Demands ──────────────────────────────────────────────────────────────────
router.get('/demands', ...guard('fees', 'view'), ctrl.listDemands);
router.get('/demands/:id', ...guard('fees', 'view'), validate(idParam), ctrl.getDemand);
router.post(
  '/demands/generate',
  ...guard('fees', 'edit'),
  validate({ body: S.generateDemands }),
  audit('fees', 'generate_demands'),
  ctrl.generateDemands,
);

// ── Concessions — request is broad, approval is not ──────────────────────────
router.get('/concessions', ...guard('fees', 'view'), ctrl.listConcessions);
router.post(
  '/concessions',
  ...guard('fees', 'add'),
  validate({ body: S.requestConcession }),
  audit('fees', 'concession_requested'),
  ctrl.requestConcession,
);
router.patch(
  '/concessions/:id/approve',
  ...guard('fees', 'approve'),
  validate({ ...idParam, body: require('zod').object({ reason: require('zod').string().max(500).optional() }) }),
  audit('fees', 'waiver_approve', { requireReason: false }),
  ctrl.approveConcession,
);

// ── Payments ─────────────────────────────────────────────────────────────────
router.get('/payments', ...guard('fees', 'view'), ctrl.listPayments);
router.post(
  '/payments/collect',
  ...guard('fees', 'add'),
  // Money moves here: an Idempotency-Key is mandatory so a retry cannot double-charge.
  idempotent({ required: true }),
  validate({ body: S.collectPayment }),
  audit('fees', 'collect_payment'),
  ctrl.collectPayment,
);
router.patch(
  '/payments/:id/reverse',
  ...guard('fees', 'approve'),
  validate({ ...idParam, body: S.reversePayment }),
  audit('fees', 'payment_reversed', { requireReason: true }),
  ctrl.reversePayment,
);

// ── Reports ──────────────────────────────────────────────────────────────────
router.get(
  '/defaulters',
  ...guard('fees', 'view'),
  validate({ query: S.defaultersQuery }),
  ctrl.defaulters,
);
router.get('/daybook', ...guard('fees', 'view'), validate({ query: S.dayBookQuery }), ctrl.dayBook);
router.get(
  '/students/:studentId/ledger',
  ...guard('fees', 'view'),
  validate({ params: require('zod').object({ studentId: schemas.objectId() }) }),
  ctrl.studentLedger,
);

module.exports = router;
