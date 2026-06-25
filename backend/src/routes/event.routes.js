const router = require('express').Router();
const ctrl = require('../controllers/event.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('events', 'view'), ctrl.list);
router.get('/upcoming', checkPermission('events', 'view'), ctrl.upcoming);
router.post('/', checkPermission('events', 'add'), audit('events', 'create'), ctrl.create);
router.put('/:id', checkPermission('events', 'edit'), audit('events', 'update'), ctrl.update);
router.delete('/:id', checkPermission('events', 'delete'), audit('events', 'delete'), ctrl.remove);

module.exports = router;
