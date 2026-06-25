const router = require('express').Router();
const ctrl = require('../controllers/hostel.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/rooms', checkPermission('hostel', 'view'), ctrl.listRooms);
router.post('/rooms', checkPermission('hostel', 'add'), audit('hostel', 'create_room'), ctrl.addRoom);
router.put('/rooms/:id', checkPermission('hostel', 'edit'), audit('hostel', 'update_room'), ctrl.updateRoom);

router.get('/allocations', checkPermission('hostel', 'view'), ctrl.listAllocations);
router.post('/allocations', checkPermission('hostel', 'add'), audit('hostel', 'allocate'), ctrl.allocate);
router.patch('/allocations/:id/vacate', checkPermission('hostel', 'edit'), audit('hostel', 'vacate'), ctrl.vacate);

module.exports = router;
