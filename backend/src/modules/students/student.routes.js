const router = require('express').Router();
const { z } = require('zod');

const { authenticate } = require('../../platform/auth/authenticate');
const { guard } = require('../../platform/rbac/checkPermission');
const { validate, schemas } = require('../../platform/validation/validate');
const { audit } = require('../../platform/audit/auditLogger');
const svc = require('./student.service');
const { sendSuccess, sendCreated, buildPaginationMeta } = require('../../shared/response');

const { objectId, nonEmptyString, isoDate, indianPhone, pinCode, aadhaar, email } = schemas;
const idParam = { params: schemas.idParam() };

const guardianSchema = z.object({
  relation: z.enum(['father', 'mother', 'guardian']).default('father'),
  name: nonEmptyString(120),
  phone: indianPhone().optional(),
  email: email().optional(),
  occupation: z.string().max(120).optional(),
  qualification: z.string().max(120).optional(),
  annualIncome: z.coerce.number().int().nonnegative().optional(),
  isPrimary: z.boolean().default(false),
});

const addressSchema = z.object({
  type: z.enum(['current', 'permanent']).default('current'),
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  village: z.string().max(120).optional(),
  taluka: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  pinCode: pinCode().optional(),
});

const createStudent = z.object({
  admissionNo: z.string().trim().max(40).optional(), // generated when absent
  grNo: z.string().trim().max(40).optional(),
  rollNo: z.string().trim().max(20).optional(),
  udisePenNo: z.string().trim().max(40).optional(),
  apaarId: z.string().trim().max(40).optional(),

  name: nonEmptyString(120),
  photo: z.string().max(500).optional(),
  dob: isoDate().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).default('unknown'),
  religion: z.string().max(60).optional(),
  caste: z.string().max(60).optional(),
  category: z.enum(['general', 'obc', 'sc', 'st', 'ews', 'rte']).default('general'),
  motherTongue: z.string().max(60).optional(),

  /** Used to derive a blind index and the last four digits, then discarded (ADR-13). */
  aadhaar: aadhaar().optional(),

  addresses: z.array(addressSchema).max(2).optional(),
  guardians: z.array(guardianSchema).max(3).optional(),

  academicGroupId: objectId().optional(),
  standardId: objectId().optional(),
  divisionName: z.string().trim().max(10).optional(),
  academicYearId: objectId().optional(),
  stream: z.enum(['science', 'commerce', 'arts', 'vocational', '']).optional(),
  house: z.string().max(40).optional(),
  admissionDate: isoDate().optional(),
  isRteStudent: z.boolean().optional(),
  branchId: objectId().optional(),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().max(120).optional(),
  status: z.enum(['enquiry', 'admitted', 'active', 'inactive', 'transferred', 'withdrawn', 'alumni']).optional(),
  academicGroupId: objectId().optional(),
  standardId: objectId().optional(),
  divisionName: z.string().max(10).optional(),
});

router.use(authenticate);

// ── Reads ────────────────────────────────────────────────────────────────────
router.get('/', ...guard('students', 'view'), validate({ query: listQuery }), async (req, res) => {
  const { items, total, page, limit } = await svc.list(req.scope, req.query);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
});

router.get('/:id/360', ...guard('students', 'view'), validate(idParam), async (req, res) => {
  sendSuccess(res, await svc.profile360(req.scope, req.params.id));
});

router.get('/:id', ...guard('students', 'view'), validate(idParam), async (req, res) => {
  sendSuccess(res, await svc.getById(req.scope, req.params.id));
});

// ── Writes ───────────────────────────────────────────────────────────────────
router.post(
  '/',
  ...guard('students', 'add'),
  validate({ body: createStudent }),
  audit('students', 'add'),
  async (req, res) => {
    sendCreated(res, await svc.create(req.scope, req.body, { req }), 'Student admitted');
  },
);

router.put(
  '/:id',
  ...guard('students', 'edit'),
  validate({ ...idParam, body: createStudent.partial() }),
  async (req, res) => {
    sendSuccess(res, await svc.update(req.scope, req.params.id, req.body, { req }), 'Student updated');
  },
);

router.post(
  '/bulk-import',
  ...guard('students', 'add'),
  validate({ body: z.object({ students: z.array(createStudent).min(1).max(1000) }) }),
  audit('students', 'bulk_import'),
  async (req, res) => {
    const result = await svc.bulkImport(req.scope, req.body.students, { req });
    sendCreated(res, result, `${result.imported} student(s) imported`);
  },
);

router.delete(
  '/:id',
  ...guard('students', 'delete'),
  validate({ ...idParam, body: z.object({ reason: z.string().max(500).optional() }).optional() }),
  audit('students', 'delete', { requireReason: false }),
  async (req, res) => {
    sendSuccess(res, await svc.withdraw(req.scope, req.params.id, req.body ?? {}, { req }), 'Student withdrawn');
  },
);

// ── Documents ────────────────────────────────────────────────────────────────
router.get(
  '/:id/documents',
  ...guard('students', 'view'),
  validate(idParam),
  async (req, res) => {
    sendSuccess(res, await svc.repos.documents().find(req.scope, { studentId: req.params.id }, { sort: { createdAt: -1 } }));
  },
);

router.post(
  '/:id/documents',
  ...guard('students', 'edit'),
  validate({
    ...idParam,
    body: z.object({
      type: z.enum([
        'birth_certificate', 'aadhaar', 'previous_tc', 'marksheet', 'address_proof',
        'caste_certificate', 'income_certificate', 'medical', 'photo', 'other',
      ]),
      name: z.string().max(200).optional(),
      storageKey: nonEmptyString(400),
      mimeType: z.string().max(120).optional(),
      sizeBytes: z.coerce.number().int().nonnegative().optional(),
      expiresAt: isoDate().optional(),
    }),
  }),
  audit('students', 'add_document'),
  async (req, res) => {
    sendCreated(res, await svc.addDocument(req.scope, req.params.id, req.body), 'Document uploaded');
  },
);

router.patch(
  '/documents/:id/verify',
  ...guard('students', 'approve'),
  validate({
    ...idParam,
    body: z.object({ verified: z.boolean(), rejectionReason: z.string().max(300).optional() }),
  }),
  audit('students', 'verify_document'),
  async (req, res) => {
    sendSuccess(res, await svc.verifyDocument(req.scope, req.params.id, req.body), 'Document updated');
  },
);

// ── Timeline ─────────────────────────────────────────────────────────────────
router.get('/:id/timeline', ...guard('students', 'view'), validate(idParam), async (req, res) => {
  sendSuccess(
    res,
    await svc.repos.timeline().find(req.scope, { studentId: req.params.id }, { sort: { occurredAt: -1 } }),
  );
});

/** RBAC §6.1 — Compliance Officer only, reason mandatory, audited per view. */
router.post(
  '/:id/aadhaar/reveal',
  ...guard('students', 'export'),
  validate({ ...idParam, body: z.object({ reason: nonEmptyString(300) }) }),
  async (req, res) => {
    sendSuccess(res, await svc.revealAadhaar(req.scope, req.params.id, req.body, { req }));
  },
);

module.exports = router;
