const router = require('express').Router();
const ctrl = require('../controllers/certificate.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.get('/verify/:code', ctrl.verify); // public — no auth

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('certificates', 'view'), ctrl.list);
router.post('/', checkPermission('certificates', 'add'), audit('certificates', 'issue', () => 'critical'), ctrl.issue);
router.get('/:id', checkPermission('certificates', 'view'), ctrl.get);
router.delete('/:id', checkPermission('certificates', 'approve'), audit('certificates', 'revoke', () => 'critical'), ctrl.revoke);

module.exports = router;
