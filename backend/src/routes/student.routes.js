const router = require('express').Router();
const ctrl = require('../controllers/student.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('students', 'view'), ctrl.list);
router.post('/', checkPermission('students', 'add'), audit('students', 'create'), ctrl.create);
router.post('/bulk-import', checkPermission('students', 'add'), audit('students', 'bulk_import'), ctrl.bulkImport);
router.post('/bulk-assign-class', checkPermission('students', 'edit'), audit('students', 'update'), ctrl.bulkAssignClass);
router.post('/promote', checkPermission('students', 'edit'), audit('students', 'update'), ctrl.promote);
router.get('/:id', checkPermission('students', 'view'), ctrl.get);
router.put('/:id', checkPermission('students', 'edit'), audit('students', 'update'), ctrl.update);
router.delete('/:id', checkPermission('students', 'delete'), audit('students', 'delete', () => 'critical'), ctrl.remove);

module.exports = router;
