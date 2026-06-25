const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('inventory', 'view'), ctrl.list);
router.get('/stats', checkPermission('inventory', 'view'), ctrl.stats);
router.post('/', checkPermission('inventory', 'add'), audit('inventory', 'create'), ctrl.create);
router.put('/:id', checkPermission('inventory', 'edit'), audit('inventory', 'update'), ctrl.update);
router.patch('/:id/stock', checkPermission('inventory', 'edit'), audit('inventory', 'adjust_stock', () => 'warning'), ctrl.adjustStock);
router.delete('/:id', checkPermission('inventory', 'delete'), audit('inventory', 'delete', () => 'warning'), ctrl.remove);

module.exports = router;
