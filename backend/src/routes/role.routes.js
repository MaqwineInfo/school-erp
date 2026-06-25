const router = require('express').Router();
const ctrl = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/modules', ctrl.moduleList);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/assign', ctrl.assignToUser);
router.get('/:id/users', ctrl.getUsersByRole);

module.exports = router;
