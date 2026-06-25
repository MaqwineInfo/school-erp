const ApprovalRequest = require('../models/ApprovalRequest');
const Leave = require('../models/Leave');
const Expense = require('../models/Expense');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

async function syncSourceRecord(item, status, reviewedBy, rejectionReason) {
  const update = { status, reviewedBy, reviewedAt: new Date(), rejectionReason: rejectionReason || null };

  if (item.resourceType === 'Leave') {
    await Leave.findByIdAndUpdate(item.resourceId, {
      $set: { status, approvedBy: reviewedBy, approvedAt: new Date(), rejectionReason: rejectionReason || null },
    });
  } else if (item.resourceType === 'Expense') {
    await Expense.findByIdAndUpdate(item.resourceId, {
      $set: { status, approvedBy: reviewedBy, ...(status === 'approved' ? { paidAt: new Date() } : {}) },
    });
  }
}

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, type, module: mod } = req.query;

  const filter = { tenantId: req.tenantId };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (mod) filter.module = mod;

  const approverRoles = ['principal', 'vice_principal', 'hr_manager', 'accountant', 'hod'];
  if (!approverRoles.includes(req.user.role) && req.user.role !== 'super_admin') {
    filter.requestedBy = req.user.userId;
  }

  const [items, total] = await Promise.all([
    ApprovalRequest.find(filter)
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit),
    ApprovalRequest.countDocuments(filter),
  ]);

  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.stats = async (req, res) => {
  const [pending, approved, rejected] = await Promise.all([
    ApprovalRequest.countDocuments({ tenantId: req.tenantId, status: 'pending' }),
    ApprovalRequest.countDocuments({ tenantId: req.tenantId, status: 'approved' }),
    ApprovalRequest.countDocuments({ tenantId: req.tenantId, status: 'rejected' }),
  ]);
  sendSuccess(res, { pending, approved, rejected });
};

exports.get = async (req, res) => {
  const item = await ApprovalRequest.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate('requestedBy', 'name email role')
    .populate('reviewedBy', 'name email role');
  if (!item) throw new AppError('Approval request not found', 404);
  sendSuccess(res, item);
};

exports.approve = async (req, res) => {
  const item = await ApprovalRequest.findOne({ _id: req.params.id, tenantId: req.tenantId, status: 'pending' });
  if (!item) throw new AppError('Approval request not found or already processed', 404);

  item.status = 'approved';
  item.reviewedBy = req.user.userId;
  item.reviewedAt = new Date();
  await item.save();

  await syncSourceRecord(item, 'approved', req.user.userId);

  sendSuccess(res, item, 'Request approved');
};

exports.reject = async (req, res) => {
  const { reason } = req.body;
  const item = await ApprovalRequest.findOne({ _id: req.params.id, tenantId: req.tenantId, status: 'pending' });
  if (!item) throw new AppError('Approval request not found or already processed', 404);

  item.status = 'rejected';
  item.reviewedBy = req.user.userId;
  item.reviewedAt = new Date();
  item.rejectionReason = reason || 'Rejected';
  await item.save();

  await syncSourceRecord(item, 'rejected', req.user.userId, reason);

  sendSuccess(res, item, 'Request rejected');
};
