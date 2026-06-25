const FeeStructure = require('../models/FeeStructure');
const FeeDemand = require('../models/FeeDemand');
const FeePayment = require('../models/FeePayment');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');

// --- Fee Structures ---
exports.listStructures = async (req, res) => {
  const { academicYearId, standardId } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (academicYearId) filter.academicYearId = academicYearId;
  if (standardId) filter.standardId = standardId;
  const structures = await FeeStructure.find(filter).populate('standardId', 'name').populate('academicYearId', 'name');
  sendSuccess(res, structures);
};

exports.createStructure = async (req, res) => {
  const structure = await FeeStructure.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, structure, 'Fee structure created', 201);
};

exports.updateStructure = async (req, res) => {
  const structure = await FeeStructure.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body }, { new: true }
  );
  if (!structure) throw new AppError('Fee structure not found', 404);
  sendSuccess(res, structure, 'Fee structure updated');
};

// --- Fee Demands ---
exports.listDemands = async (req, res) => {
  const { page = 1, limit = 20, studentId, status, academicYearId } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (studentId) filter.studentId = studentId;
  if (status) filter.status = status;
  if (academicYearId) filter.academicYearId = academicYearId;

  // Parent/student portal — restrict to linked children / own record
  if (req.user?.role === 'parent' && req.user.linkedStudentIds?.length) {
    const allowed = req.user.linkedStudentIds.map(String);
    if (studentId) {
      filter.studentId = allowed.includes(String(studentId)) ? studentId : { $in: [] };
    } else {
      filter.studentId = { $in: req.user.linkedStudentIds };
    }
  } else if (req.user?.role === 'student' && req.user.studentId) {
    filter.studentId = req.user.studentId;
  }

  const [demands, total] = await Promise.all([
    FeeDemand.find(filter).populate('studentId', 'name admissionNo').sort({ dueDate: 1 }).skip(skip).limit(+limit),
    FeeDemand.countDocuments(filter),
  ]);
  sendSuccess(res, demands, null, 200, buildPaginationMeta(total, page, limit));
};

exports.createDemand = async (req, res) => {
  const demand = await FeeDemand.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, demand, 'Fee demand created', 201);
};

exports.generateDemands = async (req, res) => {
  const { academicYearId, standardId, installmentName } = req.body;
  const FeeStructureModel = FeeStructure;
  const Student = require('../models/Student');

  const structure = await FeeStructureModel.findOne({ tenantId: req.tenantId, academicYearId, standardId, deletedAt: null });
  if (!structure) throw new AppError('Fee structure not found for this standard', 404);

  const installment = structure.installments.find(i => i.name === installmentName);
  const students = await Student.find({ tenantId: req.tenantId, standardId, status: 'active', deletedAt: null });

  const demands = students.map(s => {
    const components = structure.components.map(c => ({
      name: c.name,
      amount: c.amount,
      paid: 0,
      due: c.amount,
      gstRate: c.gstRate,
    }));
    const total = components.reduce((sum, c) => sum + c.amount, 0);
    return {
      tenantId: req.tenantId,
      studentId: s._id,
      academicYearId,
      feeStructureId: structure._id,
      installmentName,
      dueDate: installment?.dueDate,
      components,
      totalAmount: total,
      totalDue: total,
      totalPaid: 0,
      status: 'pending',
    };
  });

  await FeeDemand.insertMany(demands);
  sendSuccess(res, { count: demands.length }, `Generated ${demands.length} fee demands`, 201);
};

// --- Fee Payments ---
exports.listPayments = async (req, res) => {
  const { page = 1, limit = 20, studentId, method, from, to } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (studentId) filter.studentId = studentId;
  if (method) filter.method = method;
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(from);
    if (to) filter.paidAt.$lte = new Date(to);
  }
  const [payments, total] = await Promise.all([
    FeePayment.find(filter).populate('studentId', 'name admissionNo').populate('collectedBy', 'name').sort({ paidAt: -1 }).skip(skip).limit(+limit),
    FeePayment.countDocuments(filter),
  ]);
  sendSuccess(res, payments, null, 200, buildPaginationMeta(total, page, limit));
};

exports.collectPayment = async (req, res) => {
  const { studentId, demandId, amount, method, chequeNo, bankName, gatewayTxnId, remarks } = req.body;
  if (!studentId || !amount) throw new AppError('studentId and amount required', 400);

  const lastPayment = await FeePayment.findOne({ tenantId: req.tenantId }).sort({ createdAt: -1 }).select('receiptNo');
  const nextNo = lastPayment ? (parseInt(lastPayment.receiptNo.replace(/\D/g, '')) || 0) + 1 : 1;
  const receiptNo = `RCP${String(nextNo).padStart(6, '0')}`;

  const payment = await FeePayment.create({
    tenantId: req.tenantId,
    branchId: req.user.branchId,
    studentId, demandId, receiptNo, amount, method, chequeNo, bankName, gatewayTxnId, remarks,
    collectedBy: req.user.userId,
    paidAt: new Date(),
  });

  if (demandId) {
    const demand = await FeeDemand.findById(demandId);
    if (demand) {
      demand.totalPaid = (demand.totalPaid || 0) + amount;
      demand.totalDue = demand.totalAmount - demand.totalPaid;
      demand.status = demand.totalDue <= 0 ? 'paid' : 'partial';
      await demand.save();
    }
  }

  sendSuccess(res, payment, 'Payment collected', 201);
};

exports.defaulters = async (req, res) => {
  const { academicYearId, standardId } = req.query;
  const filter = { tenantId: req.tenantId, status: { $in: ['pending','partial','overdue'] }, deletedAt: null };
  if (academicYearId) filter.academicYearId = academicYearId;
  const demands = await FeeDemand.find(filter).populate('studentId', 'name admissionNo standardId divisionName').populate('academicYearId', 'name');
  sendSuccess(res, demands);
};

exports.applyConcession = async (req, res) => {
  const { concessionAmount, reason } = req.body;
  const demand = await FeeDemand.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!demand) throw new AppError('Demand not found', 404);
  demand.concession = Math.min(concessionAmount, demand.totalAmount);
  demand.totalDue = Math.max(0, demand.totalAmount - demand.concession - (demand.paidAmount || 0));
  if (demand.totalDue === 0) demand.status = 'paid';
  if (reason) demand.concessionReason = reason;
  await demand.save();
  sendSuccess(res, demand, 'Concession applied');
};
