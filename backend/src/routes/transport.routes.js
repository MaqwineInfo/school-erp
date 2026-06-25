const router = require('express').Router();
const ctrl = require('../controllers/transport.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/vehicles', checkPermission('transport', 'view'), ctrl.listVehicles);
router.post('/vehicles', checkPermission('transport', 'add'), audit('transport', 'create_vehicle'), ctrl.addVehicle);
router.put('/vehicles/:id', checkPermission('transport', 'edit'), audit('transport', 'update_vehicle'), ctrl.updateVehicle);
router.delete('/vehicles/:id', checkPermission('transport', 'delete'), audit('transport', 'delete_vehicle'), ctrl.removeVehicle);

router.get('/routes', checkPermission('transport', 'view'), ctrl.listRoutes);
router.post('/routes', checkPermission('transport', 'add'), audit('transport', 'create_route'), ctrl.addRoute);
router.put('/routes/:id', checkPermission('transport', 'edit'), audit('transport', 'update_route'), ctrl.updateRoute);
router.delete('/routes/:id', checkPermission('transport', 'delete'), audit('transport', 'delete_route'), ctrl.removeRoute);

module.exports = router;
