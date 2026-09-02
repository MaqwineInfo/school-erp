const router = require('express').Router();
const { z } = require('zod');

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const svc = require('./attendance.service');
const { sendSuccess } = require('../../shared/response');

const { objectId, isoDate } = schemas;

const markBody = z.object({
  academicGroupId: objectId(),
  date: isoDate(),
  periodNo: z.coerce.number().int().min(0).max(12).default(0),
  subjectId: objectId().optional(),
  session: z.enum(['full_day', 'morning', 'afternoon']).default('full_day'),
  reason: z.string().max(500).optional(),
  records: z
    .array(
      z.object({
        studentId: objectId(),
        status: z.enum(['present', 'absent', 'late', 'leave', 'half_day', 'holiday']).default('present'),
        source: z.enum(['manual', 'biometric', 'rfid', 'qr', 'face', 'import']).default('manual'),
        leaveType: z.enum(['medical', 'personal', 'sanctioned', '']).default(''),
        inTime: z.string().max(5).optional(),
        outTime: z.string().max(5).optional(),
        remarks: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(500),
});

router.use(authenticate);

/** Today's register for a class. */
router.get(
  '/register',
  ...guard('attendance', 'view'),
  validate({ query: z.object({ academicGroupId: objectId(), date: isoDate() }) }),
  async (req, res) => {
    sendSuccess(res, await svc.groupRegister(req.scope, req.query));
  },
);

router.post(
  '/mark',
  ...guard('attendance', 'add'),
  validate({ body: markBody }),
  audit('attendance', 'mark'),
  async (req, res) => {
    const result = await svc.markAttendance(req.scope, req.body, {
      req,
      // The override authority comes from RBAC, not from a hard-coded role check.
      canOverride: !!req.permission?.canApprove,
    });
    sendSuccess(res, result, 'Attendance saved');
  },
);

/** Device ingestion — biometric, RFID, QR, face. */
router.post(
  '/events',
  ...guard('attendance', 'add'),
  validate({
    body: z.object({
      studentId: objectId(),
      timestamp: isoDate().optional(),
      source: z.enum(['biometric', 'rfid', 'qr', 'face']).default('biometric'),
      deviceId: z.string().max(60).optional(),
    }),
  }),
  async (req, res) => {
    sendSuccess(res, await svc.ingestDeviceEvent(req.scope, req.body, { req }));
  },
);

router.get(
  '/students/:studentId/summary',
  ...guard('attendance', 'view'),
  validate({
    params: z.object({ studentId: objectId() }),
    query: z.object({ from: isoDate(), to: isoDate() }),
  }),
  async (req, res) => {
    sendSuccess(
      res,
      await svc.studentSummary(req.scope, { studentId: req.params.studentId, ...req.query }),
    );
  },
);

module.exports = router;
