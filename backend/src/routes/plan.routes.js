const router = require('express').Router();
const ctrl = require('../controllers/plan.controller');
const { authenticate } = require('../middleware/auth');

// Public
router.get('/public', ctrl.listPublic);

// Super admin only
router.use(authenticate);
router.post('/', ctrl.upsert);
router.get('/tenants', ctrl.listTenants);
router.get('/tenants/:id', ctrl.getTenant);
router.put('/tenants/:id', ctrl.updateTenant);
router.patch('/tenants/:id/status', ctrl.toggleStatus);
router.get('/saas-stats', ctrl.saasStats);

module.exports = router;
