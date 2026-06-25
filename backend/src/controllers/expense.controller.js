const Expense = require('../models/Expense');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');
const { createApprovalRequest, resolveApproval } = require('../utils/approval.helper');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, status, from, to, search } = req.query;

  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: 'i' };
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(from);
    if (to) filter.paidAt.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    Expense.find(filter).populate('approvedBy', 'name').populate('createdBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter),
  ]);

  // Summary
  const summary = await Expense.aggregate([
    { $match: { tenantId: req.tenantId, deletedAt: null, ...(status ? { status } : {}) } },
    { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  sendSuccess(res, { items, summary }, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const e = await Expense.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }).populate('approvedBy', 'name').populate('createdBy', 'name');
  if (!e) throw new AppError('Expense not found', 404);
  sendSuccess(res, e);
};

exports.create = async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    tenantId: req.tenantId,
    branchId: req.user?.branchId,
    createdBy: req.user.userId,
    status: req.body.status || 'pending',
  });

  await createApprovalRequest({
    tenantId: req.tenantId,
    branchId: req.user?.branchId,
    type: 'expense',
    title: `Expense — ${expense.title || expense.category}`,
    description: `₹${expense.amount} — ${expense.description || ''}`,
    resourceType: 'Expense',
    resourceId: expense._id,
    requestedBy: req.user.userId,
    metadata: { amount: expense.amount, category: expense.category },
  }).catch(() => {});

  sendSuccess(res, expense, 'Expense submitted for approval', 201);
};

exports.update = async (req, res) => {
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body }, { new: true }
  );
  if (!expense) throw new AppError('Expense not found', 404);
  sendSuccess(res, expense, 'Expense updated');
};

exports.approve = async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { status, approvedBy: req.user.userId, ...(status === 'approved' ? { paidAt: new Date() } : {}) } },
    { new: true }
  );
  if (!expense) throw new AppError('Expense not found', 404);

  await resolveApproval({
    resourceType: 'Expense',
    resourceId: expense._id,
    status,
    reviewedBy: req.user.userId,
    rejectionReason: req.body.rejectionReason,
  }).catch(() => {});

  sendSuccess(res, expense, `Expense ${status}`);
};

exports.remove = async (req, res) => {
  await Expense.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Expense deleted');
};

exports.categoryStats = async (req, res) => {
  const { month, year } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    filter.paidAt = { $gte: start, $lte: end };
  }
  const stats = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  sendSuccess(res, stats);
};
