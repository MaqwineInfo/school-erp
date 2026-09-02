const router = require('express').Router();
const { z } = require('zod');

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const svc = require('./marks.service');
const { sendSuccess, sendCreated } = require('../../shared/response');

const { objectId, nonEmptyString, isoDate } = schemas;
const idParam = { params: schemas.idParam() };

const createExam = z.object({
  name: nonEmptyString(120),
  type: z
    .enum(['unit_test', 'half_yearly', 'annual', 'pre_board', 'practical', 'project', 'viva', 'mcq', 'olympiad', 'internal'])
    .default('unit_test'),
  academicYearId: objectId(),
  academicGroupIds: z.array(objectId()).default([]),
  subjectIds: z.array(objectId()).default([]),
  startDate: isoDate().optional(),
  endDate: isoDate().optional(),
  showRank: z.boolean().default(true),
  branchId: objectId().optional(),
});

const saveMarks = z.object({
  examId: objectId(),
  subjectId: objectId(),
  academicGroupId: objectId(),
  entries: z
    .array(
      z.object({
        studentId: objectId(),
        marksObtained: z.coerce.number().min(0).nullable().optional(),
        maxMarks: z.coerce.number().min(1).optional(),
        isAbsent: z.boolean().default(false),
        remarks: z.string().max(500).optional(),
        reason: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(500),
});

router.use(authenticate);

// ── Exams ────────────────────────────────────────────────────────────────────
router.get('/', ...guard('examinations', 'view'), async (req, res) => {
  sendSuccess(res, await svc.repos.exams().find(req.scope, {}, { sort: { startDate: -1 } }));
});

router.post(
  '/',
  ...guard('examinations', 'add'),
  validate({ body: createExam }),
  audit('examinations', 'create_exam'),
  async (req, res) => {
    sendCreated(res, await svc.repos.exams().create(req.scope, req.body), 'Exam created');
  },
);

// ── Marks ────────────────────────────────────────────────────────────────────
// NOTE: every literal path must be declared BEFORE `/:id`, or Express matches the
// parameterised route first and `/exams/marks` arrives as id="marks" — a 400 from the
// ObjectId validator rather than the marks list.
router.get('/marks', ...guard('examinations', 'view'), async (req, res) => {
  const criteria = {};
  if (req.query.examId) criteria.examId = req.query.examId;
  if (req.query.subjectId) criteria.subjectId = req.query.subjectId;
  if (req.query.academicGroupId) criteria.academicGroupId = req.query.academicGroupId;

  sendSuccess(
    res,
    await svc.repos.marks().find(req.scope, criteria, {
      populate: [
        { path: 'studentId', select: 'name admissionNo rollNo' },
        { path: 'subjectId', select: 'name code' },
      ],
      sort: { 'studentId.rollNo': 1 },
    }),
  );
});

router.post(
  '/marks',
  ...guard('examinations', 'add'),
  validate({ body: saveMarks }),
  audit('examinations', 'save_marks'),
  async (req, res) => {
    const saved = await svc.saveMarks(req.scope, req.body, { req });
    sendSuccess(res, saved, `${saved.length} mark(s) saved`);
  },
);

router.patch(
  '/marks/verify',
  ...guard('examinations', 'approve'),
  validate({
    body: z.object({ examId: objectId(), subjectId: objectId(), academicGroupId: objectId().optional() }),
  }),
  audit('examinations', 'verify_marks'),
  async (req, res) => {
    const count = await svc.verifyMarks(req.scope, req.body, { req });
    sendSuccess(res, { verified: count }, `${count} mark(s) verified`);
  },
);

router.patch(
  '/marks/lock',
  ...guard('examinations', 'approve'),
  validate({ body: z.object({ examId: objectId(), subjectId: objectId().optional() }) }),
  audit('examinations', 'lock_marks'),
  async (req, res) => {
    const count = await svc.lockMarks(req.scope, req.body, { req });
    sendSuccess(res, { locked: count }, `${count} mark(s) locked`);
  },
);

/** Post-lock correction — raises the RBAC §5.4 workflow, never edits directly. */
router.post(
  '/marks/:id/correction',
  ...guard('examinations', 'edit'),
  validate({
    ...idParam,
    body: z.object({ newMarks: z.coerce.number().min(0), reason: nonEmptyString(500) }),
  }),
  audit('examinations', 'mark_correction_requested', { requireReason: true }),
  async (req, res) => {
    const request = await svc.requestCorrection(
      req.scope,
      { marksEntryId: req.params.id, ...req.body },
      { req },
    );
    sendCreated(res, request, 'Correction request submitted for approval');
  },
);

// ── A single exam (declared after every literal path) ────────────────────────
router.get('/:id', ...guard('examinations', 'view'), validate(idParam), async (req, res) => {
  sendSuccess(res, await svc.repos.exams().findByIdOrFail(req.scope, req.params.id));
});

// ── Results ──────────────────────────────────────────────────────────────────
router.get('/:id/publish-readiness', ...guard('examinations', 'view'), validate(idParam), async (req, res) => {
  sendSuccess(res, await svc.publishReadiness(req.scope, req.params.id));
});

router.post(
  '/:id/publish',
  ...guard('examinations', 'approve'),
  validate(idParam),
  audit('examinations', 'publish_results'),
  async (req, res) => {
    sendSuccess(res, await svc.publishResults(req.scope, req.params.id, { req }), 'Results published');
  },
);

router.get(
  '/:id/report-card/:studentId',
  ...guard('examinations', 'view'),
  validate({ params: z.object({ id: objectId(), studentId: objectId() }) }),
  async (req, res) => {
    sendSuccess(res, await svc.reportCard(req.scope, { examId: req.params.id, studentId: req.params.studentId }));
  },
);

module.exports = router;
