const router = require('express').Router();
const ctrl = require('../controllers/payroll.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('payroll', 'view'), ctrl.list);
router.get('/stats', checkPermission('payroll', 'view'), ctrl.stats);
router.post('/process-month', checkPermission('payroll', 'add'), audit('payroll', 'process_month', () => 'warning'), ctrl.processMonth);
router.post('/mark-paid', checkPermission('payroll', 'approve'), audit('payroll', 'mark_paid', () => 'critical'), ctrl.markPaid);
router.post('/', checkPermission('payroll', 'add'), audit('payroll', 'upsert'), ctrl.upsert);
router.get('/slip/:staffId/:month/:year', checkPermission('payroll', 'view'), ctrl.salarySlip);
router.get('/:id', checkPermission('payroll', 'view'), ctrl.get);

module.exports = router;
