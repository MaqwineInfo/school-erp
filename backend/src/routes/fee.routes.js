const router = require('express').Router();
const ctrl = require('../controllers/fee.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);

// Fee Structures — edit permission required (blocks cashier counter staff)
router.get('/structures', checkPermission('fees', 'edit'), ctrl.listStructures);
router.post('/structures', checkPermission('fees', 'add'), audit('fees', 'create_structure', () => 'warning'), ctrl.createStructure);
router.put('/structures/:id', checkPermission('fees', 'edit'), audit('fees', 'update_structure', () => 'warning'), ctrl.updateStructure);

// Fee Demands — edit permission (accountant/principal; not cashier)
router.get('/demands', checkPermission('fees', 'view'), ctrl.listDemands);
router.post('/demands', checkPermission('fees', 'edit'), audit('fees', 'create_demand'), ctrl.createDemand);
router.post('/demands/generate', checkPermission('fees', 'edit'), audit('fees', 'generate_demands', () => 'warning'), ctrl.generateDemands);
router.patch('/demands/:id/concession', checkPermission('fees', 'approve'), audit('fees', 'apply_concession', () => 'warning'), ctrl.applyConcession);

// Fee Payments
router.get('/payments', checkPermission('fees', 'view'), ctrl.listPayments);
router.post('/payments/collect', checkPermission('fees', 'add'), audit('fees', 'collect_payment'), ctrl.collectPayment);

// Reports
router.get('/defaulters', checkPermission('fees', 'view'), ctrl.defaulters);

module.exports = router;
