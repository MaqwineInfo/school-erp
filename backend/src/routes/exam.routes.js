const router = require('express').Router();
const ctrl = require('../controllers/exam.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('examinations', 'view'), ctrl.list);
router.post('/', checkPermission('examinations', 'add'), audit('examinations', 'create'), ctrl.create);
router.get('/:id', checkPermission('examinations', 'view'), ctrl.get);
router.put('/:id', checkPermission('examinations', 'edit'), audit('examinations', 'update'), ctrl.update);
router.patch('/:id/publish', checkPermission('examinations', 'approve'), audit('examinations', 'publish', () => 'warning'), ctrl.publish);
router.delete('/:id', checkPermission('examinations', 'delete'), audit('examinations', 'delete'), ctrl.remove);

router.post('/marks/enter', checkPermission('examinations', 'add'), audit('examinations', 'enter_marks'), ctrl.enterMarks);
router.get('/marks', checkPermission('examinations', 'view'), ctrl.getMarks);
router.get('/marks/:studentId/result-card', checkPermission('examinations', 'view'), ctrl.resultCard);

module.exports = router;
