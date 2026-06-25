const router = require('express').Router();
const ctrl = require('../controllers/health.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('students', 'view'), ctrl.list);
router.post('/', checkPermission('students', 'add'), audit('students', 'health_create'), ctrl.create);
router.get('/student/:studentId', checkPermission('students', 'view'), ctrl.studentSummary);
router.put('/:id', checkPermission('students', 'edit'), audit('students', 'health_update'), ctrl.update);
router.delete('/:id', checkPermission('students', 'delete'), audit('students', 'health_delete'), ctrl.remove);

module.exports = router;
