const router = require('express').Router();
const ctrl = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', checkPermission('tasks', 'view'), ctrl.list);
router.post('/', checkPermission('tasks', 'add'), ctrl.create);
router.put('/:id', checkPermission('tasks', 'edit'), ctrl.update);
router.delete('/:id', checkPermission('tasks', 'delete'), ctrl.remove);

module.exports = router;
