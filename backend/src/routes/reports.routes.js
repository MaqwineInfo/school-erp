const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/student-strength', checkPermission('reports', 'view'), ctrl.studentStrength);
router.get('/students/export', checkPermission('reports', 'export'), ctrl.exportStudents);
router.get('/attendance-summary', checkPermission('reports', 'view'), ctrl.attendanceSummary);
router.get('/attendance-defaulters', checkPermission('reports', 'view'), ctrl.defaulterAttendance);
router.get('/fee-collection', checkPermission('reports', 'view'), ctrl.feeCollection);
router.get('/fee-defaulters', checkPermission('reports', 'view'), ctrl.feeDefaulters);
router.get('/staff-list', checkPermission('reports', 'view'), ctrl.staffList);
router.get('/payroll-summary', checkPermission('reports', 'view'), ctrl.payrollSummary);
router.get('/payroll/export', checkPermission('reports', 'export'), ctrl.exportPayroll);

module.exports = router;
