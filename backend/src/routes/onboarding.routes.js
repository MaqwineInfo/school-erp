const router = require('express').Router();
const ctrl = require('../controllers/onboarding.controller');

// Public — no auth needed for onboarding flow
router.post('/start', ctrl.startOnboarding);           // Step 1
router.post('/plan', ctrl.selectPlan);                 // Step 2
router.post('/academic', ctrl.academicSetup);          // Step 3
router.post('/admin-user', ctrl.createAdminUser);      // Step 4
router.post('/fee-setup', ctrl.feeSetup);              // Step 5
router.post('/import-students', ctrl.importStudents);  // Step 6
router.post('/payment-gateway', ctrl.paymentGatewaySetup); // Step 7
router.post('/sms-setup', ctrl.smsSetup);              // Step 8
router.get('/status/:tenantId', ctrl.getStatus);       // Resume check

module.exports = router;
