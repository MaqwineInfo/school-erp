const router = require('express').Router();
const ctrl = require('../controllers/sms.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('communication', 'view'), ctrl.list);
router.get('/stats', checkPermission('communication', 'view'), ctrl.stats);
router.post('/send', checkPermission('communication', 'add'), audit('communication', 'send_sms'), ctrl.send);

module.exports = router;
