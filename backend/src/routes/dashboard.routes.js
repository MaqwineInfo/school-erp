const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authenticate);
router.get('/principal', checkPermission('dashboard', 'view'), ctrl.principalDashboard);
router.get('/student', checkPermission('dashboard', 'view'), ctrl.studentDashboard);
router.get('/stats', checkPermission('dashboard', 'view'), ctrl.principalDashboard);

module.exports = router;
