const router = require('express').Router();
const ctrl = require('../controllers/alumni.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', checkPermission('alumni', 'view'), ctrl.list);
router.post('/', checkPermission('alumni', 'add'), ctrl.create);
router.put('/:id', checkPermission('alumni', 'edit'), ctrl.update);
router.delete('/:id', checkPermission('alumni', 'delete'), ctrl.remove);

module.exports = router;
