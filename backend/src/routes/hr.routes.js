const router = require('express').Router();
const ctrl = require('../controllers/hr.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);

// Staff records
router.get('/staff', checkPermission('hr', 'view'), ctrl.listStaff);
router.post('/staff', checkPermission('hr', 'add'), audit('hr', 'create_staff'), ctrl.createStaff);
router.get('/staff/:id', checkPermission('hr', 'view'), ctrl.getStaff);
router.put('/staff/:id', checkPermission('hr', 'edit'), audit('hr', 'update_staff'), ctrl.updateStaff);
router.delete('/staff/:id', checkPermission('hr', 'delete'), audit('hr', 'delete_staff', () => 'warning'), ctrl.removeStaff);

// Leave
router.get('/leaves', checkPermission('hr', 'view'), ctrl.listLeaves);
router.post('/leaves', checkPermission('hr', 'add'), audit('hr', 'leave_apply'), ctrl.applyLeave);
router.patch('/leaves/:id/approve', checkPermission('hr', 'approve'), audit('hr', 'leave_approve', () => 'warning'), ctrl.approveLeave);

// Payroll
router.get('/payroll', checkPermission('payroll', 'view'), ctrl.listPayroll);
router.post('/payroll/generate', checkPermission('payroll', 'add'), audit('payroll', 'generate', () => 'warning'), ctrl.generatePayroll);
router.patch('/payroll/:id/paid', checkPermission('payroll', 'approve'), audit('payroll', 'mark_paid', () => 'critical'), ctrl.markPaid);

module.exports = router;
