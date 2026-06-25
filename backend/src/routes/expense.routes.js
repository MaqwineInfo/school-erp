const router = require('express').Router();
const ctrl = require('../controllers/expense.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('expenses', 'view'), ctrl.list);
router.get('/category-stats', checkPermission('expenses', 'view'), ctrl.categoryStats);
router.post('/', checkPermission('expenses', 'add'), audit('expenses', 'create'), ctrl.create);
router.get('/:id', checkPermission('expenses', 'view'), ctrl.get);
router.put('/:id', checkPermission('expenses', 'edit'), audit('expenses', 'update'), ctrl.update);
router.patch('/:id/approve', checkPermission('expenses', 'approve'), audit('expenses', 'approve', () => 'warning'), ctrl.approve);
router.delete('/:id', checkPermission('expenses', 'delete'), audit('expenses', 'delete', () => 'warning'), ctrl.remove);

module.exports = router;
