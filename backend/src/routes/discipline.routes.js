const router = require('express').Router();
const ctrl = require('../controllers/discipline.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', checkPermission('discipline', 'view'), ctrl.list);
router.post('/', checkPermission('discipline', 'add'), ctrl.create);
router.put('/:id', checkPermission('discipline', 'edit'), ctrl.update);
router.delete('/:id', checkPermission('discipline', 'delete'), ctrl.remove);

module.exports = router;
