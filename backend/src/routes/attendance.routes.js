const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.post('/mark', checkPermission('attendance', 'add'), audit('attendance', 'mark'), ctrl.mark);
router.get('/by-date', checkPermission('attendance', 'view'), ctrl.getByDate);
router.get('/monthly', checkPermission('attendance', 'view'), ctrl.monthly);
router.get('/summary', checkPermission('attendance', 'view'), ctrl.summary);

module.exports = router;
