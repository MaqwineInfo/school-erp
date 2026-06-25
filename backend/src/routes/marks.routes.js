const router = require('express').Router();
const ctrl = require('../controllers/marks.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('examinations', 'view'), ctrl.list);
router.post('/bulk', checkPermission('examinations', 'add'), audit('examinations', 'bulk_marks_entry'), ctrl.bulkSave);
router.post('/verify', checkPermission('examinations', 'approve'), audit('examinations', 'verify_marks', () => 'warning'), ctrl.verify);
router.get('/report-card/:studentId/:examId', checkPermission('examinations', 'view'), ctrl.reportCard);
router.get('/class-summary', checkPermission('examinations', 'view'), ctrl.classSummary);

module.exports = router;
