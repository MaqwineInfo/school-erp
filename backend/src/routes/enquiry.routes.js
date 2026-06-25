const router = require('express').Router();
const ctrl = require('../controllers/enquiry.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('admissions', 'view'), ctrl.list);
router.post('/', checkPermission('admissions', 'add'), audit('admissions', 'create_enquiry'), ctrl.create);
router.get('/:id', checkPermission('admissions', 'view'), ctrl.get);
router.put('/:id', checkPermission('admissions', 'edit'), audit('admissions', 'update_enquiry'), ctrl.update);
router.patch('/:id/status', checkPermission('admissions', 'edit'), audit('admissions', 'update_status'), ctrl.updateStatus);
router.post('/:id/convert', checkPermission('admissions', 'approve'), audit('admissions', 'convert_to_student', () => 'warning'), ctrl.convertToStudent);
router.delete('/:id', checkPermission('admissions', 'delete'), audit('admissions', 'delete_enquiry'), ctrl.remove);

module.exports = router;
