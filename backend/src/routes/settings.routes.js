const router = require('express').Router();
const ctrl = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);

// School profile
router.get('/profile', checkPermission('settings', 'view'), ctrl.getProfile);
router.put('/profile', checkPermission('settings', 'edit'), audit('settings', 'update_profile', () => 'warning'), ctrl.updateProfile);
router.put('/modules', checkPermission('settings', 'edit'), audit('settings', 'update_modules', () => 'warning'), ctrl.updateModules);

// User management
router.get('/users', checkPermission('role_management', 'view'), ctrl.listUsers);
router.post('/users', checkPermission('role_management', 'add'), audit('role_management', 'create_user', () => 'critical'), ctrl.createUser);
router.put('/users/:id', checkPermission('role_management', 'edit'), audit('role_management', 'update_user', () => 'warning'), ctrl.updateUser);
router.patch('/users/:id/toggle', checkPermission('role_management', 'edit'), audit('role_management', 'toggle_user', () => 'warning'), ctrl.toggleActive);
router.delete('/users/:id', checkPermission('role_management', 'delete'), audit('role_management', 'delete_user', () => 'critical'), ctrl.deleteUser);

module.exports = router;
