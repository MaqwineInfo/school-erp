const { z, schemas } = require('../../platform/validation/validate');

const { objectId, nonEmptyString, paise, isoDate } = schemas;

const createHead = z.object({
  name: nonEmptyString(80),
  code: z.string().trim().max(20).optional(),
  description: z.string().max(500).optional(),
  category: z
    .enum(['tuition', 'admission', 'transport', 'hostel', 'mess', 'activity', 'exam', 'uniform', 'book', 'deposit', 'fine', 'other'])
    .default('other'),
  gstRate: z.coerce.number().min(0).max(28).default(0),
  hsnSac: z.string().trim().max(20).optional(),
  isRefundable: z.boolean().default(false),
  isDeposit: z.boolean().default(false),
  concessionAllowed: z.boolean().default(true),
  branchId: objectId().optional(),
});

const componentInput = z.object({
  feeHeadId: objectId(),
  name: nonEmptyString(80),
  amount: paise(),
  gstRate: z.coerce.number().min(0).max(28).default(0),
  isOptional: z.boolean().default(false),
});

const installmentInput = z.object({
  name: nonEmptyString(40),
  dueDate: isoDate(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  amount: paise().optional(),
});

const createStructureBase = z.object({
    name: nonEmptyString(120),
    academicYearId: objectId(),
    standardId: objectId().optional(),
    courseId: objectId().optional(),
    branchId: objectId().optional(),
    category: z.enum(['all', 'general', 'obc', 'sc', 'st', 'ews', 'rte']).default('all'),
    stream: z.enum(['science', 'commerce', 'arts', 'vocational', '']).default(''),
    schedule: z.enum(['annual_installments', 'monthly', 'one_time', 'per_course']).default('annual_installments'),
    components: z.array(componentInput).min(1),
    installments: z.array(installmentInput).default([]),
    lateFee: z
      .object({
        enabled: z.boolean().default(false),
        mode: z.enum(['per_day', 'per_month', 'flat', 'slab']).default('per_day'),
        amount: paise().default(0),
        graceDays: z.coerce.number().int().min(0).default(0),
        maxAmount: paise().default(0),
      })
      .optional(),
});

/**
 * .refine() turns a ZodObject into a ZodEffects, which has no .partial() — so the base
 * object is kept separately for PATCH/PUT bodies.
 */
const createStructure = createStructureBase
  .refine((d) => d.standardId || d.courseId, {
    message: 'A fee structure must target either a class or a course',
    path: ['standardId'],
  })
  .refine(
    (d) => {
      if (d.schedule !== 'annual_installments' || !d.installments.length) return true;
      const usesPercentage = d.installments.every((i) => i.percentage !== undefined);
      if (!usesPercentage) return true;
      const total = d.installments.reduce((s, i) => s + i.percentage, 0);
      return Math.abs(total - 100) < 0.01;
    },
    { message: 'Instalment percentages must add up to 100', path: ['installments'] },
  );

const generateDemands = z.object({
  academicGroupId: objectId(),
  academicYearId: objectId(),
  installmentName: z.string().trim().max(40).optional(),
  dueDate: isoDate().optional(),
});

const collectPayment = z
  .object({
    studentId: objectId(),
    demandIds: z.array(objectId()).default([]),
    amount: paise().refine((v) => v > 0, 'Amount must be greater than zero'),
    method: z.enum(['cash', 'cheque', 'dd', 'neft', 'rtgs', 'upi', 'card', 'netbanking', 'wallet', 'adjustment']),
    chequeNo: z.string().trim().max(30).optional(),
    chequeDate: isoDate().optional(),
    bankName: z.string().trim().max(120).optional(),
    gateway: z.enum(['razorpay', 'cashfree', 'payu', 'noop']).optional(),
    gatewayOrderId: z.string().max(120).optional(),
    gatewayPaymentId: z.string().max(120).optional(),
    remarks: z.string().max(500).optional(),
    paidAt: isoDate().optional(),
  })
  .refine((d) => (d.method === 'cheque' || d.method === 'dd' ? !!d.chequeNo : true), {
    message: 'A cheque or DD number is required for this payment method',
    path: ['chequeNo'],
  });

const requestConcession = z.object({
  studentId: objectId(),
  academicYearId: objectId(),
  type: z.enum(['sibling', 'staff_ward', 'merit', 'sports', 'need_based', 'rte', 'single_parent', 'other']),
  isPercentage: z.boolean().default(true),
  value: z.coerce.number().min(0),
  feeHeadIds: z.array(objectId()).default([]),
  reason: nonEmptyString(500),
  validFrom: isoDate().optional(),
  validTo: isoDate().optional(),
});

const reversePayment = z.object({
  reason: nonEmptyString(300),
  bounceCharge: paise().default(0),
});

const defaultersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  academicGroupId: objectId().optional(),
  minAmount: paise().default(1),
});

const dayBookQuery = z.object({ date: isoDate().default(() => new Date()) });

const updateStructure = createStructureBase.partial();

module.exports = {
  createHead,
  createStructure,
  updateStructure,
  generateDemands,
  collectPayment,
  requestConcession,
  reversePayment,
  defaultersQuery,
  dayBookQuery,
};
