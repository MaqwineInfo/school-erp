const router = require('express').Router();
const ctrl = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('tasks', 'view'), ctrl.list);
router.get('/stats', checkPermission('tasks', 'view'), ctrl.stats);
router.get('/:id', checkPermission('tasks', 'view'), ctrl.get);
router.patch('/:id/approve', checkPermission('tasks', 'approve'), audit('tasks', 'approve', () => 'warning'), ctrl.approve);
router.patch('/:id/reject', checkPermission('tasks', 'approve'), audit('tasks', 'reject', () => 'warning'), ctrl.reject);

module.exports = router;
