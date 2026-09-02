const router = require('express').Router();
const ctrl = require('../controllers/health.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('health', 'view'), ctrl.list);
router.post('/', checkPermission('health', 'add'), audit('health', 'health_create'), ctrl.create);
router.get('/student/:studentId', checkPermission('health', 'view'), ctrl.studentSummary);
router.put('/:id', checkPermission('health', 'edit'), audit('health', 'health_update'), ctrl.update);
router.delete('/:id', checkPermission('health', 'delete'), audit('health', 'health_delete'), ctrl.remove);

module.exports = router;
