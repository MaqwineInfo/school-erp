const router = require('express').Router();
const ctrl = require('../controllers/visitor.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('visitor_management', 'view'), ctrl.list);
router.post('/check-in', checkPermission('visitor_management', 'add'), audit('visitor_management', 'check_in'), ctrl.checkIn);
router.patch('/:id/check-out', checkPermission('visitor_management', 'edit'), audit('visitor_management', 'check_out'), ctrl.checkOut);
router.get('/:id', checkPermission('visitor_management', 'view'), ctrl.get);

module.exports = router;
