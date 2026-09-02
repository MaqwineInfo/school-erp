const router = require('express').Router();

const homeworkRoutes = require('./homework.routes');
const timetableRoutes = require('./timetable.routes');
const marksRoutes = require('./marks.routes');
const leaveRoutes = require('./leave.routes');
const payrollRoutes = require('./payroll.routes');

router.use('/public', require('./public.routes'));
// Auth — Phase 2 module first (refresh, MFA, forgot/reset, sessions); legacy
// controller remains as a fall-through for /register until the Identity UI lands.
router.use('/auth', require('../modules/identity').routes);
router.use('/auth', require('./auth.routes'));
router.use('/onboarding', require('./onboarding.routes'));
router.use('/plans', require('./plan.routes'));
router.use('/roles', require('./role.routes'));
router.use('/dashboard', require('./dashboard.routes'));

// Student & Admissions
// Students — Phase 4 module first, legacy router as fall-through (bulk-assign-class,
// promote and other un-ported endpoints still resolve there).
router.use('/students', require('../modules/students').routes);
router.use('/students', require('./student.routes'));
router.use('/admissions', require('./enquiry.routes'));

// Academics — the Phase 3 module is mounted FIRST so its routes win; any path it does
// not define falls through to the legacy router while the migration completes
// (architecture §21 step 2 — the two layers coexist, nothing is cut over at once).
router.use('/academics', require('../modules/academics').routes);
router.use('/academics', require('./academic.routes'));
router.use('/timetable', timetableRoutes);
router.use('/academics/timetable', timetableRoutes);
router.use('/homework', homeworkRoutes);
router.use('/academics/homework', homeworkRoutes);

// Attendance
// Attendance — Phase 7 module first, legacy router as fall-through.
router.use('/attendance', require('../modules/attendance').routes);
router.use('/attendance', require('./attendance.routes'));

// Fees — Phase 6 module first, legacy router as fall-through (architecture §21 step 2).
router.use('/fees', require('../modules/fees').routes);
router.use('/fees', require('./fee.routes'));

// Exams & Marks
// Exams — Phase 10 module first, legacy router as fall-through.
router.use('/exams', require('../modules/exams').routes);
router.use('/exams', require('./exam.routes'));
router.use('/marks', marksRoutes);
router.use('/exams/marks', marksRoutes);

// HR & Payroll
router.use('/hr', require('./hr.routes'));
router.use('/leaves', leaveRoutes);
router.use('/hr/leaves', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/hr/payroll', payrollRoutes);

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
// Communication — Phase 8 module; legacy /sms kept as fall-through.
router.use('/communication', require('../modules/communication').routes);
router.use('/sms', require('./sms.routes'));
router.use('/health', require('./health.routes'));

// Settings
router.use('/settings', require('./settings.routes'));

// Audit Logs
router.use('/audit-logs', require('./auditlog.routes'));

// Approvals
// Approvals — Phase 11 engine first, legacy router as fall-through.
router.use('/approvals', require('../modules/approvals').routes);
router.use('/approvals', require('./approval.routes'));

router.use('/discipline', require('./discipline.routes'));
router.use('/alumni', require('./alumni.routes'));
router.use('/meal', require('./meal.routes'));
router.use('/tasks', require('./task.routes'));

// Notices
router.use('/', require('./notice.routes'));

module.exports = router;
