const router = require('express').Router();
const ctrl = require('../controllers/auditlog.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.use(authenticate);
router.get('/', checkPermission('audit_logs', 'view'), ctrl.list);
router.get('/stats', checkPermission('audit_logs', 'view'), ctrl.stats);
router.get('/:id', checkPermission('audit_logs', 'view'), ctrl.getOne);

module.exports = router;
