/**
 * Request validation for the academics module (ADR-06).
 * Unknown keys are stripped, so nothing unvalidated ever reaches a model.
 */
const { z, schemas } = require('../../platform/validation/validate');

const { objectId, nonEmptyString, divisionName, isoDate, paise } = schemas;

const createYear = z.object({
  name: nonEmptyString(20),
  startDate: isoDate(),
  endDate: isoDate(),
  branchId: objectId().optional(),
  terms: z
    .array(z.object({ name: nonEmptyString(40), startDate: isoDate(), endDate: isoDate() }))
    .optional(),
  holidays: z
    .array(
      z.object({
        name: nonEmptyString(80),
        date: isoDate(),
        type: z.enum(['national', 'religious', 'regional', 'school']).default('school'),
      }),
    )
    .optional(),
});

const createStandard = z.object({
  name: nonEmptyString(60),
  shortName: z.string().trim().max(10).optional(),
  order: z.coerce.number().int().min(0).max(20),
  stage: z.enum(['pre_primary', 'primary', 'middle', 'secondary', 'senior_secondary']).default('primary'),
  streams: z.array(z.enum(['science', 'commerce', 'arts', 'vocational'])).optional(),
  branchId: objectId().optional(),
});

const createCourse = z.object({
  name: nonEmptyString(120),
  code: z.string().trim().max(20).optional(),
  description: z.string().max(2000).optional(),
  targetAudience: z.string().max(200).optional(),
  subjectIds: z.array(objectId()).optional(),
  durationMonths: z.coerce.number().int().min(1).max(60).default(12),
  feeModel: z.enum(['one_time', 'monthly', 'installment']).default('monthly'),
  baseFee: paise().default(0),
  branchId: objectId().optional(),
});

const createGroup = z
  .object({
    kind: z.enum(['section', 'batch']).default('section'),
    name: nonEmptyString(40),
    standardId: objectId().optional(),
    courseId: objectId().optional(),
    academicYearId: objectId().optional(),
    branchId: objectId().optional(),
    inchargeId: objectId().optional(),
    roomNo: z.string().max(20).optional(),
    stream: z.enum(['science', 'commerce', 'arts', 'vocational', '']).optional(),
    capacity: z.coerce.number().int().min(0).max(500).default(40),
    schedule: z
      .array(
        z.object({
          dayOfWeek: z.coerce.number().int().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      )
      .optional(),
    startDate: isoDate().optional(),
    endDate: isoDate().optional(),
  })
  .refine((d) => (d.kind === 'section' ? !!d.standardId : true), {
    message: 'A section must belong to a class',
    path: ['standardId'],
  })
  .refine((d) => (d.kind === 'batch' ? !!d.courseId : true), {
    message: 'A batch must belong to a course',
    path: ['courseId'],
  });

const createSubject = z.object({
  name: nonEmptyString(80),
  code: z.string().trim().max(20).optional(),
  type: z.enum(['core', 'language', 'elective', 'co_scholastic', 'practical', 'lab']).default('core'),
  maxMarks: z.coerce.number().int().min(1).max(1000).default(100),
  passMarks: z.coerce.number().int().min(0).max(1000).default(35),
  periodsPerWeek: z.coerce.number().int().min(0).max(40).default(5),
  standardIds: z.array(objectId()).optional(),
  departmentId: objectId().optional(),
  branchId: objectId().optional(),
});

const createDepartment = z.object({
  name: nonEmptyString(60),
  code: z.string().trim().max(20).optional(),
  headId: objectId().optional(),
  branchId: objectId().optional(),
});

const enrolBody = z.object({
  studentId: objectId(),
  academicGroupId: objectId(),
  rollNo: z.string().trim().max(20).optional(),
  joinedAt: isoDate().optional(),
  isProrated: z.boolean().optional(),
});

const transferBody = z.object({
  studentId: objectId(),
  toGroupId: objectId(),
  reason: z.enum(['promoted', 'transferred', 'section_change']).default('transferred'),
  rollNo: z.string().trim().max(20).optional(),
});

const promoteBody = z.object({
  studentIds: z.array(objectId()).min(1).max(500),
  toGroupId: objectId(),
  detainedIds: z.array(objectId()).optional(),
});

const renameGroupBody = z.object({ name: nonEmptyString(40) });

const listGroupsQuery = z.object({
  kind: z.enum(['section', 'batch']).optional(),
  standardId: objectId().optional(),
  courseId: objectId().optional(),
  academicYearId: objectId().optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
});

module.exports = {
  createYear,
  createStandard,
  createCourse,
  createGroup,
  createSubject,
  createDepartment,
  enrolBody,
  transferBody,
  promoteBody,
  renameGroupBody,
  listGroupsQuery,
  divisionNameSchema: divisionName(),
};
