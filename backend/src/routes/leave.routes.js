const router = require('express').Router();
const ctrl = require('../controllers/leave.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('hr', 'view'), ctrl.list);
router.get('/balance', checkPermission('hr', 'view'), ctrl.balance);
router.get('/summary', checkPermission('hr', 'view'), ctrl.summary);
router.post('/', checkPermission('hr', 'add'), audit('hr', 'leave_apply'), ctrl.create);
router.get('/:id', checkPermission('hr', 'view'), ctrl.get);
router.patch('/:id/approve', checkPermission('hr', 'approve'), audit('hr', 'leave_approve', () => 'warning'), ctrl.approve);
router.patch('/:id/cancel', checkPermission('hr', 'edit'), audit('hr', 'leave_cancel'), ctrl.cancel);

module.exports = router;
