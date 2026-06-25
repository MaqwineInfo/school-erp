const router = require('express').Router();
const ctrl = require('../controllers/homework.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('homework', 'view'), ctrl.list);
router.post('/', checkPermission('homework', 'add'), audit('homework', 'create'), ctrl.create);
router.get('/:id', checkPermission('homework', 'view'), ctrl.get);
router.put('/:id', checkPermission('homework', 'edit'), audit('homework', 'update'), ctrl.update);
router.delete('/:id', checkPermission('homework', 'delete'), audit('homework', 'delete'), ctrl.remove);

module.exports = router;
