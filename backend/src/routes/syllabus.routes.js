const router = require('express').Router();
const ctrl = require('../controllers/syllabus.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('study_material', 'view'), ctrl.list);
router.get('/one', checkPermission('study_material', 'view'), ctrl.get);
router.post('/', checkPermission('study_material', 'add'), audit('study_material', 'save_syllabus'), ctrl.save);
router.patch('/chapter', checkPermission('study_material', 'edit'), audit('study_material', 'update_chapter'), ctrl.updateChapter);
router.get('/materials', checkPermission('study_material', 'view'), ctrl.listMaterials);
router.post('/materials', checkPermission('study_material', 'add'), audit('study_material', 'create_material'), ctrl.createMaterial);
router.delete('/materials/:id', checkPermission('study_material', 'delete'), audit('study_material', 'delete_material'), ctrl.deleteMaterial);

module.exports = router;
