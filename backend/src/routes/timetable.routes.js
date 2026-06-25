const router = require('express').Router();
const ctrl = require('../controllers/timetable.controller');
const { authenticate } = require('../middleware/auth');
const { checkPermission, applyBranchScope, audit } = require('../middleware/rbac');

router.use(authenticate, applyBranchScope);
router.get('/', checkPermission('timetable', 'view'), ctrl.list);
router.get('/class', checkPermission('timetable', 'view'), ctrl.get);
router.get('/teacher/:teacherId', checkPermission('timetable', 'view'), ctrl.getTeacher);
router.get('/my', checkPermission('timetable', 'view'), ctrl.getTeacher);
router.post('/save', checkPermission('timetable', 'add'), audit('timetable', 'save'), ctrl.save);
router.post('/slot', checkPermission('timetable', 'edit'), audit('timetable', 'update_slot'), ctrl.updateSlot);
router.delete('/:id', checkPermission('timetable', 'delete'), audit('timetable', 'delete'), ctrl.remove);

module.exports = router;
