const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/onboarding', require('./onboarding.routes'));
router.use('/plans', require('./plan.routes'));
router.use('/roles', require('./role.routes'));
router.use('/dashboard', require('./dashboard.routes'));

// Student & Admissions
router.use('/students', require('./student.routes'));
router.use('/admissions', require('./enquiry.routes'));

// Academics
router.use('/academics', require('./academic.routes'));
router.use('/timetable', require('./timetable.routes'));
router.use('/homework', require('./homework.routes'));

// Attendance
router.use('/attendance', require('./attendance.routes'));

// Fees
router.use('/fees', require('./fee.routes'));

// Exams & Marks
router.use('/exams', require('./exam.routes'));
router.use('/marks', require('./marks.routes'));

// HR & Payroll
router.use('/hr', require('./hr.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/payroll', require('./payroll.routes'));

// Other modules
router.use('/library', require('./library.routes'));
router.use('/transport', require('./transport.routes'));
router.use('/hostel', require('./hostel.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/visitors', require('./visitor.routes'));
router.use('/certificates', require('./certificate.routes'));
router.use('/reports', require('./reports.routes'));

// Events, Health, Inventory, Syllabus, SMS
router.use('/events', require('./event.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/syllabus', require('./syllabus.routes'));
router.use('/sms', require('./sms.routes'));
router.use('/health', require('./health.routes'));

// Settings
router.use('/settings', require('./settings.routes'));

// Audit Logs
router.use('/audit-logs', require('./auditlog.routes'));

// Approvals
router.use('/approvals', require('./approval.routes'));

// Notices
router.use('/', require('./notice.routes'));

module.exports = router;
