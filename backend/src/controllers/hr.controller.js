const Staff = require('../models/Staff');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');

// --- Staff ---
exports.listStaff = async (req, res) => {
  const { page = 1, limit = 20, search, department, isActive } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (department) filter.department = department;
  if (search) filter.$text = { $search: search };
  const [staff, total] = await Promise.all([
    Staff.find(filter).sort({ name: 1 }).skip((page-1)*limit).limit(+limit),
    Staff.countDocuments(filter),
  ]);
  sendSuccess(res, staff, null, 200, buildPaginationMeta(total, page, limit));
};

exports.getStaff = async (req, res) => {
  const staff = await Staff.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }).populate('userId', 'email role');
  if (!staff) throw new AppError('Staff not found', 404);
  sendSuccess(res, staff);
};

exports.createStaff = async (req, res) => {
  const exists = await Staff.findOne({ employeeId: req.body.employeeId, tenantId: req.tenantId, deletedAt: null });
  if (exists) throw new AppError('Employee ID already exists', 409);
  const staff = await Staff.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, staff, 'Staff created', 201);
};

exports.updateStaff = async (req, res) => {
  const staff = await Staff.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }, { $set: req.body }, { new: true });
  if (!staff) throw new AppError('Staff not found', 404);
  sendSuccess(res, staff, 'Staff updated');
};

exports.removeStaff = async (req, res) => {
  await Staff.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date(), isActive: false } });
  sendSuccess(res, null, 'Staff deleted');
};

// --- Leave ---
exports.listLeaves = async (req, res) => {
  const { page = 1, limit = 20, staffId, status, type } = req.query;
  const filter = { tenantId: req.tenantId };
  if (staffId) filter.staffId = staffId;
  if (status) filter.status = status;
  if (type) filter.type = type;
  const [leaves, total] = await Promise.all([
    Leave.find(filter).populate('staffId', 'name employeeId').sort({ appliedAt: -1 }).skip((page-1)*limit).limit(+limit),
    Leave.countDocuments(filter),
  ]);
  sendSuccess(res, leaves, null, 200, buildPaginationMeta(total, page, limit));
};

exports.applyLeave = async (req, res) => {
  const leave = await Leave.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, leave, 'Leave applied', 201);
};

exports.approveLeave = async (req, res) => {
  const { action, rejectionReason } = req.body;
  const status = action === 'approve' ? 'approved' : 'rejected';
  const leave = await Leave.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { status, approvedBy: req.user.userId, approvedAt: new Date(), rejectionReason } },
    { new: true }
  );
  if (!leave) throw new AppError('Leave not found', 404);
  sendSuccess(res, leave, `Leave ${status}`);
};

// --- Payroll ---
exports.listPayroll = async (req, res) => {
  const { month, year, status } = req.query;
  const filter = { tenantId: req.tenantId };
  if (month) filter.month = +month;
  if (year) filter.year = +year;
  if (status) filter.status = status;
  const payrolls = await Payroll.find(filter).populate('staffId', 'name employeeId designation').sort({ createdAt: -1 });
  sendSuccess(res, payrolls);
};

exports.generatePayroll = async (req, res) => {
  const { month, year, staffData } = req.body;
  if (!Array.isArray(staffData)) throw new AppError('staffData array required', 400);

  const ops = staffData.map(s => ({
    updateOne: {
      filter: { tenantId: req.tenantId, staffId: s.staffId, month, year },
      update: { $set: { ...s, tenantId: req.tenantId, month, year, status: 'processed' } },
      upsert: true,
    },
  }));

  await Payroll.bulkWrite(ops);
  sendSuccess(res, null, 'Payroll generated');
};

exports.markPaid = async (req, res) => {
  const { bankRef } = req.body;
  const payroll = await Payroll.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { status: 'paid', paidAt: new Date(), bankRef } },
    { new: true }
  );
  if (!payroll) throw new AppError('Payroll record not found', 404);
  sendSuccess(res, payroll, 'Marked as paid');
};
