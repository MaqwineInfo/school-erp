const svc = require('./fee.service');
const { sendSuccess, sendCreated, buildPaginationMeta, parsePagination } = require('../../shared/response');

// ── Fee heads ────────────────────────────────────────────────────────────────
exports.listHeads = async (req, res) => {
  sendSuccess(res, await svc.repos.heads().find(req.scope, {}, { sort: { sortOrder: 1, name: 1 } }));
};

exports.createHead = async (req, res) => {
  sendCreated(res, await svc.repos.heads().create(req.scope, req.body), 'Fee head created');
};

// ── Structures ───────────────────────────────────────────────────────────────
exports.listStructures = async (req, res) => {
  const items = await svc.repos.structures().find(req.scope, req.query.academicYearId ? { academicYearId: req.query.academicYearId } : {}, {
    populate: [
      { path: 'standardId', select: 'name' },
      { path: 'courseId', select: 'name' },
    ],
    sort: { name: 1 },
  });
  sendSuccess(res, items);
};

exports.createStructure = async (req, res) => {
  sendCreated(res, await svc.repos.structures().create(req.scope, req.body), 'Fee structure created');
};

exports.updateStructure = async (req, res) => {
  sendSuccess(
    res,
    await svc.repos.structures().updateByIdOrFail(req.scope, req.params.id, req.body),
    'Fee structure updated',
  );
};

// ── Demands ──────────────────────────────────────────────────────────────────
exports.listDemands = async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const criteria = {};
  if (req.query.studentId) criteria.studentId = req.query.studentId;
  if (req.query.status) criteria.status = req.query.status;
  if (req.query.academicYearId) criteria.academicYearId = req.query.academicYearId;

  const { items, total } = await svc.repos.demands().paginate(req.scope, criteria, {
    page,
    limit,
    sort: { dueDate: 1 },
    populate: { path: 'studentId', select: 'name admissionNo rollNo' },
  });

  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.getDemand = async (req, res) => {
  sendSuccess(
    res,
    await svc.repos.demands().findByIdOrFail(req.scope, req.params.id, {
      populate: { path: 'studentId', select: 'name admissionNo rollNo guardians' },
    }),
  );
};

exports.generateDemands = async (req, res) => {
  const result = await svc.generateDemands(req.scope, req.body, { req });
  const msg = `${result.generated} generated, ${result.skipped} already existed, ${result.errors.length} failed`;
  sendSuccess(res, result, msg);
};

// ── Concessions ──────────────────────────────────────────────────────────────
exports.listConcessions = async (req, res) => {
  const criteria = {};
  if (req.query.status) criteria.status = req.query.status;
  if (req.query.studentId) criteria.studentId = req.query.studentId;
  sendSuccess(
    res,
    await svc.repos.concessions().find(req.scope, criteria, {
      sort: { createdAt: -1 },
      populate: { path: 'studentId', select: 'name admissionNo' },
    }),
  );
};

exports.requestConcession = async (req, res) => {
  sendCreated(res, await svc.requestConcession(req.scope, req.body, { req, scope: req.scope }), 'Concession requested');
};

exports.approveConcession = async (req, res) => {
  const result = await svc.approveConcession(req.scope, req.params.id, req.body, { req });
  sendSuccess(res, result, 'Concession approved and applied');
};

// ── Payments ─────────────────────────────────────────────────────────────────
exports.listPayments = async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const criteria = {};
  if (req.query.studentId) criteria.studentId = req.query.studentId;
  if (req.query.method) criteria.method = req.query.method;
  if (req.query.from || req.query.to) {
    criteria.paidAt = {};
    if (req.query.from) criteria.paidAt.$gte = new Date(req.query.from);
    if (req.query.to) criteria.paidAt.$lte = new Date(req.query.to);
  }

  const { items, total } = await svc.repos.payments().paginate(req.scope, criteria, {
    page,
    limit,
    sort: { paidAt: -1 },
    populate: [
      { path: 'studentId', select: 'name admissionNo' },
      { path: 'collectedBy', select: 'name' },
    ],
  });

  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.collectPayment = async (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key');
  const { payment, demands } = await svc.collectPayment(
    req.scope,
    { ...req.body, idempotencyKey },
    { req },
  );
  sendCreated(res, { payment, demands }, `Receipt ${payment.receiptNo} issued`);
};

exports.reversePayment = async (req, res) => {
  sendSuccess(res, await svc.reversePayment(req.scope, req.params.id, req.body, { req }), 'Payment reversed');
};

// ── Reports ──────────────────────────────────────────────────────────────────
exports.defaulters = async (req, res) => {
  const { items, total, page, limit } = await svc.defaulters(req.scope, req.query);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.dayBook = async (req, res) => {
  sendSuccess(res, await svc.dayBook(req.scope, req.query));
};

exports.studentLedger = async (req, res) => {
  const [outstanding, demandList, paymentList] = await Promise.all([
    svc.outstandingForStudent(req.scope, req.params.studentId),
    svc.repos.demands().find(req.scope, { studentId: req.params.studentId }, { sort: { dueDate: 1 } }),
    svc.repos.payments().find(req.scope, { studentId: req.params.studentId }, { sort: { paidAt: -1 } }),
  ]);
  sendSuccess(res, { outstanding, demands: demandList, payments: paymentList });
};
