/**
 * Academics routes.
 *
 * Every route follows the standard chain (architecture §5):
 *   authenticate → guard(module, action) → validate(schema) → controller
 * `guard` combines the module gate (403 MODULE_DISABLED) with the permission gate
 * (403 FORBIDDEN) and produces req.scope, which the repository requires.
 */
const router = require('express').Router();

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const S = require('./academic.schema');
const ctrl = require('./academic.controller');

const idParam = { params: schemas.idParam() };

router.use(authenticate);

// ── Setup status ─────────────────────────────────────────────────────────────
router.get('/setup-status', ...guard('academics', 'view'), ctrl.setupStatus);

// ── Academic years ───────────────────────────────────────────────────────────
router.get('/years', ...guard('academics', 'view'), ctrl.listYears);
router.post(
  '/years',
  ...guard('academics', 'add'),
  validate({ body: S.createYear }),
  audit('academics', 'create_year'),
  ctrl.createYear,
);
router.patch(
  '/years/:id/activate',
  ...guard('academics', 'edit'),
  validate(idParam),
  audit('academics', 'activate_year'),
  ctrl.activateYear,
);

// ── Standards ────────────────────────────────────────────────────────────────
router.get('/standards', ...guard('academics', 'view'), ctrl.listStandards);
router.post(
  '/standards',
  ...guard('academics', 'add'),
  validate({ body: S.createStandard }),
  audit('academics', 'create_standard'),
  ctrl.createStandard,
);
router.put(
  '/standards/:id',
  ...guard('academics', 'edit'),
  validate({ ...idParam, body: S.createStandard.partial() }),
  ctrl.updateStandard,
);
router.delete(
  '/standards/:id',
  ...guard('academics', 'delete'),
  validate(idParam),
  audit('academics', 'delete_standard'),
  ctrl.deleteStandard,
);

// ── Courses (coaching) ───────────────────────────────────────────────────────
router.get('/courses', ...guard('academics', 'view'), ctrl.listCourses);
router.post(
  '/courses',
  ...guard('academics', 'add'),
  validate({ body: S.createCourse }),
  audit('academics', 'create_course'),
  ctrl.createCourse,
);

// ── Academic groups ──────────────────────────────────────────────────────────
router.get(
  '/groups',
  ...guard('academics', 'view'),
  validate({ query: S.listGroupsQuery }),
  ctrl.listGroups,
);
router.post(
  '/groups',
  ...guard('academics', 'add'),
  validate({ body: S.createGroup }),
  audit('academics', 'create_group'),
  ctrl.createGroup,
);
router.patch(
  '/groups/:id/rename',
  ...guard('academics', 'edit'),
  validate({ ...idParam, body: S.renameGroupBody }),
  ctrl.renameGroup,
);
router.delete(
  '/groups/:id',
  ...guard('academics', 'delete'),
  validate(idParam),
  audit('academics', 'delete_group'),
  ctrl.deleteGroup,
);
router.get('/groups/:id/roster', ...guard('students', 'view'), validate(idParam), ctrl.groupRoster);

// ── Subjects & departments ───────────────────────────────────────────────────
router.get('/subjects', ...guard('academics', 'view'), ctrl.listSubjects);
router.post(
  '/subjects',
  ...guard('academics', 'add'),
  validate({ body: S.createSubject }),
  audit('academics', 'create_subject'),
  ctrl.createSubject,
);
router.put(
  '/subjects/:id',
  ...guard('academics', 'edit'),
  validate({ ...idParam, body: S.createSubject.partial() }),
  ctrl.updateSubject,
);
router.delete('/subjects/:id', ...guard('academics', 'delete'), validate(idParam), ctrl.deleteSubject);

router.get('/departments', ...guard('academics', 'view'), ctrl.listDepartments);
router.post(
  '/departments',
  ...guard('academics', 'add'),
  validate({ body: S.createDepartment }),
  ctrl.createDepartment,
);

// ── Enrolment ────────────────────────────────────────────────────────────────
router.post(
  '/enrolments',
  ...guard('students', 'add'),
  validate({ body: S.enrolBody }),
  audit('students', 'enrol'),
  ctrl.enrol,
);
router.post(
  '/enrolments/transfer',
  ...guard('students', 'edit'),
  validate({ body: S.transferBody }),
  audit('students', 'transfer'),
  ctrl.transfer,
);
router.post(
  '/enrolments/promote',
  ...guard('students', 'edit'),
  validate({ body: S.promoteBody }),
  audit('students', 'promote'),
  ctrl.promote,
);
router.get(
  '/enrolments/student/:studentId',
  ...guard('students', 'view'),
  validate({ params: require('zod').object({ studentId: schemas.objectId() }) }),
  ctrl.studentEnrolment,
);
router.get(
  '/enrolments/student/:studentId/history',
  ...guard('students', 'view'),
  validate({ params: require('zod').object({ studentId: schemas.objectId() }) }),
  ctrl.studentEnrolmentHistory,
);

module.exports = router;
