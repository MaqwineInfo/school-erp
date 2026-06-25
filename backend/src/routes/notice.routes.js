const router = require('express').Router();
const Notice = require('../models/Notice');
const Expense = require('../models/Expense');
const Visitor = require('../models/Visitor');
const Certificate = require('../models/Certificate');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');

router.use(authenticate);

// Notices
router.get('/notices', async (req, res) => {
  const { page = 1, limit = 20, type, scope } = req.query;
  const filter = { tenantId: req.tenantId, isPublished: true, deletedAt: null };
  if (type) filter.type = type;
  if (scope) filter['audience.scope'] = scope;
  const [notices, total] = await Promise.all([
    Notice.find(filter).populate('createdBy', 'name').sort({ publishAt: -1 }).skip((page-1)*limit).limit(+limit),
    Notice.countDocuments(filter),
  ]);
  sendSuccess(res, notices, null, 200, buildPaginationMeta(total, page, limit));
});
router.post('/notices', async (req, res) => {
  const n = await Notice.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId, createdBy: req.user.userId });
  sendSuccess(res, n, 'Notice created', 201);
});
router.put('/notices/:id', async (req, res) => {
  const n = await Notice.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!n) throw new AppError('Notice not found', 404);
  sendSuccess(res, n, 'Notice updated');
});
router.delete('/notices/:id', async (req, res) => {
  await Notice.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Deleted');
});

// Expenses
router.get('/expenses', async (req, res) => {
  const { page = 1, limit = 20, category, status, from, to } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(from);
    if (to) filter.paidAt.$lte = new Date(to);
  }
  const [expenses, total] = await Promise.all([
    Expense.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
    Expense.countDocuments(filter),
  ]);
  sendSuccess(res, expenses, null, 200, buildPaginationMeta(total, page, limit));
});
router.post('/expenses', async (req, res) => {
  const e = await Expense.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId, createdBy: req.user.userId });
  sendSuccess(res, e, 'Expense created', 201);
});
router.patch('/expenses/:id/approve', async (req, res) => {
  const { action } = req.body;
  const status = action === 'approve' ? 'approved' : 'rejected';
  const e = await Expense.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { status, approvedBy: req.user.userId } }, { new: true });
  if (!e) throw new AppError('Expense not found', 404);
  sendSuccess(res, e, `Expense ${status}`);
});

// Visitors
router.get('/visitors', async (req, res) => {
  const { page = 1, limit = 20, from, to } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (from || to) {
    filter.checkIn = {};
    if (from) filter.checkIn.$gte = new Date(from);
    if (to) filter.checkIn.$lte = new Date(to);
  }
  const [visitors, total] = await Promise.all([
    Visitor.find(filter).sort({ checkIn: -1 }).skip((page-1)*limit).limit(+limit),
    Visitor.countDocuments(filter),
  ]);
  sendSuccess(res, visitors, null, 200, buildPaginationMeta(total, page, limit));
});
router.post('/visitors', async (req, res) => {
  const last = await Visitor.findOne({ tenantId: req.tenantId }).sort({ createdAt: -1 }).select('gatePassNo');
  const nextNo = last ? (parseInt(last.gatePassNo?.replace(/\D/g, '') || '0') || 0) + 1 : 1;
  const gatePassNo = `GP${String(nextNo).padStart(5, '0')}`;
  const v = await Visitor.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId, gatePassNo, createdBy: req.user.userId });
  sendSuccess(res, v, 'Visitor logged', 201);
});
router.patch('/visitors/:id/checkout', async (req, res) => {
  const v = await Visitor.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { checkOut: new Date() } }, { new: true });
  if (!v) throw new AppError('Visitor not found', 404);
  sendSuccess(res, v, 'Visitor checked out');
});

// Certificates
router.get('/certificates', async (req, res) => {
  const { studentId, type } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (studentId) filter.studentId = studentId;
  if (type) filter.type = type;
  const certs = await Certificate.find(filter).populate('studentId', 'name admissionNo').sort({ createdAt: -1 });
  sendSuccess(res, certs);
});
router.post('/certificates', async (req, res) => {
  const last = await Certificate.findOne({ tenantId: req.tenantId, type: req.body.type }).sort({ createdAt: -1 }).select('serialNo');
  const nextNo = last ? (parseInt(last.serialNo?.replace(/\D/g, '') || '0') || 0) + 1 : 1;
  const prefix = (req.body.type || 'CERT').toUpperCase().slice(0, 3);
  const serialNo = `${prefix}${String(nextNo).padStart(5, '0')}`;
  const verificationCode = `VF${Date.now().toString(36).toUpperCase()}`;
  const cert = await Certificate.create({ ...req.body, tenantId: req.tenantId, serialNo, verificationCode, issuedBy: req.user.userId });
  sendSuccess(res, cert, 'Certificate issued', 201);
});
router.get('/certificates/verify/:code', async (req, res) => {
  const cert = await Certificate.findOne({ verificationCode: req.params.code, deletedAt: null }).populate('studentId', 'name admissionNo');
  if (!cert) throw new AppError('Certificate not found or invalid', 404);
  sendSuccess(res, cert);
});

module.exports = router;
