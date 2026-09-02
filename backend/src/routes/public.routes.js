const router = require('express').Router();
const ctrl = require('../controllers/public.controller');

router.get('/schools/:slug', ctrl.getSchool);
router.get('/schools/:slug/classes', ctrl.getClasses);
router.post('/schools/:slug/admissions', ctrl.submitAdmission);

module.exports = router;
