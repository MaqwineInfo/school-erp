const router = require('express').Router();
const ctrl = require('../controllers/meal.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', checkPermission('hostel', 'view'), ctrl.list);
router.post('/', checkPermission('hostel', 'add'), ctrl.create);
router.put('/:id', checkPermission('hostel', 'edit'), ctrl.update);
router.delete('/:id', checkPermission('hostel', 'delete'), ctrl.remove);

module.exports = router;
