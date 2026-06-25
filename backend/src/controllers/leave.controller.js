const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');
const { createApprovalRequest, resolveApproval, cancelApproval } = require('../utils/approval.helper');

const LEAVE_LABELS = { cl: 'Casual Leave', sl: 'Sick Leave', el: 'Earned Leave', ml: 'Maternity Leave', pl: 'Paternity Leave', lop: 'Loss of Pay', comp_off: 'Compensatory Off', on_duty: 'On Duty' };

// Annual leave quota per type
const ANNUAL_QUOTA = { cl: 12, sl: 12, el: 15, ml: 180, pl: 15, comp_off: 0, lop: 0, on_duty: 0 };

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { staffId, status, type, from, to } = req.query;

  const filter = { tenantId: req.tenantId };
  if (staffId) filter.staffId = staffId;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (from || to) {
    filter.from = {};
    if (from) filter.from.$gte = new Date(from);
    if (to) filter.from.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    Leave.find(filter)
      .populate('staffId', 'name employeeId designation department')
      .populate('approvedBy', 'name')
      .sort({ appliedAt: -1 })
      .skip(skip).limit(limit),
    Leave.countDocuments(filter),
  ]);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate('staffId', 'name employeeId designation')
    .populate('approvedBy', 'name');
  if (!leave) throw new AppError('Leave not found', 404);
  sendSuccess(res, leave);
};

exports.create = async (req, res) => {
  const { staffId, type, from, to, reason } = req.body;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await Leave.create({ tenantId: req.tenantId, staffId, type, from: fromDate, to: toDate, reason, status: 'pending' });

  const staff = await Staff.findById(staffId).select('name employeeId');
  await createApprovalRequest({
    tenantId: req.tenantId,
    branchId: req.user.branchId,
    type: 'leave',
    title: `Leave Request — ${staff?.name || 'Staff'}`,
    description: `${LEAVE_LABELS[type] || type}: ${fromDate.toLocaleDateString('en-IN')} to ${toDate.toLocaleDateString('en-IN')}. ${reason || ''}`,
    resourceType: 'Leave',
    resourceId: leave._id,
    requestedBy: req.user.userId,
    metadata: { staffId, type, days, from, to },
  }).catch(() => {});

  sendSuccess(res, { ...leave.toObject(), days }, 'Leave application submitted', 201);
};

exports.approve = async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected'].includes(status)) throw new AppError('Invalid status', 400);

  const leave = await Leave.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { status, approvedBy: req.user.userId, approvedAt: new Date(), rejectionReason: rejectionReason || null } },
    { new: true }
  ).populate('staffId', 'name employeeId');
  if (!leave) throw new AppError('Leave not found', 404);

  await resolveApproval({
    resourceType: 'Leave',
    resourceId: leave._id,
    status,
    reviewedBy: req.user.userId,
    rejectionReason,
  }).catch(() => {});

  sendSuccess(res, leave, `Leave ${status}`);
};

exports.cancel = async (req, res) => {
  const leave = await Leave.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, status: 'pending' },
    { $set: { status: 'cancelled' } }, { new: true }
  );
  if (!leave) throw new AppError('Leave not found or cannot be cancelled', 400);
  await cancelApproval({ resourceType: 'Leave', resourceId: leave._id }).catch(() => {});
  sendSuccess(res, leave, 'Leave cancelled');
};

// Leave balance for a staff
exports.balance = async (req, res) => {
  const { staffId, year = new Date().getFullYear() } = req.query;
  if (!staffId) throw new AppError('staffId required', 400);

  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  const approved = await Leave.find({ tenantId: req.tenantId, staffId, status: 'approved', from: { $gte: yearStart, $lte: yearEnd } });

  const taken = {};
  approved.forEach(l => {
    const days = Math.ceil((new Date(l.to) - new Date(l.from)) / (1000 * 60 * 60 * 24)) + 1;
    taken[l.type] = (taken[l.type] || 0) + days;
  });

  const balance = Object.keys(ANNUAL_QUOTA).map(type => ({
    type, label: LEAVE_LABELS[type],
    quota: ANNUAL_QUOTA[type], taken: taken[type] || 0,
    available: Math.max(0, ANNUAL_QUOTA[type] - (taken[type] || 0)),
  }));

  sendSuccess(res, balance);
};

// Leave summary for all staff (for HR dashboard)
exports.summary = async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  const summary = await Leave.aggregate([
    { $match: { tenantId: req.tenantId, from: { $gte: start, $lte: end }, status: 'approved' } },
    { $group: { _id: { staffId: '$staffId', type: '$type' }, totalDays: { $sum: { $divide: [{ $subtract: ['$to', '$from'] }, 86400000] } } } },
    { $group: { _id: '$_id.staffId', leaves: { $push: { type: '$_id.type', days: { $add: ['$totalDays', 1] } } } } },
  ]);

  sendSuccess(res, summary);
};
