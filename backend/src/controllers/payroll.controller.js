const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const Leave = require('../models/Leave');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

function calcGrossAndDeductions(basic, lopDays, workingDays) {
  const da = Math.round(basic * 0.10);
  const hra = Math.round(basic * 0.15);
  const ta = 1600;
  const specialAllowance = Math.round(basic * 0.05);
  const gross = basic + da + hra + ta + specialAllowance;

  // LOP deduction
  const perDaySalary = Math.round(gross / (workingDays || 26));
  const lopDeduction = lopDays * perDaySalary;

  const pf = Math.round(basic * 0.12);
  const esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const professionalTax = gross > 15000 ? 200 : gross > 10000 ? 150 : 0;
  const tds = 0; // simplified
  const totalDeductions = pf + esic + professionalTax + tds + lopDeduction;

  return {
    earnings: { basic, da, hra, ta, specialAllowance, bonus: 0, incentive: 0, total: gross },
    deductions: { pf, esic, professionalTax, tds, lop: lopDeduction, loanEmi: 0, total: totalDeductions },
    netSalary: gross - totalDeductions,
  };
}

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { month, year, status, staffId } = req.query;

  const filter = { tenantId: req.tenantId };
  if (month) filter.month = +month;
  if (year) filter.year = +year;
  if (status) filter.status = status;
  if (staffId) filter.staffId = staffId;

  const [items, total] = await Promise.all([
    Payroll.find(filter).populate('staffId', 'name employeeId designation department bankAccount').sort({ 'staffId.name': 1 }).skip(skip).limit(limit),
    Payroll.countDocuments(filter),
  ]);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const p = await Payroll.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate('staffId', 'name employeeId designation department bankAccount');
  if (!p) throw new AppError('Payroll not found', 404);
  sendSuccess(res, p);
};

// Process payroll for a month (bulk generate for all active staff)
exports.processMonth = async (req, res) => {
  const { month, year, workingDays = 26 } = req.body;
  if (!month || !year) throw new AppError('month and year required', 400);

  const staffList = await Staff.find({ tenantId: req.tenantId, isActive: true });

  // Calculate LOP for each staff
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const lopData = await Leave.aggregate([
    { $match: { tenantId: req.tenantId, type: 'lop', status: 'approved', from: { $gte: monthStart, $lte: monthEnd } } },
    { $group: { _id: '$staffId', days: { $sum: { $divide: [{ $add: [{ $subtract: ['$to', '$from'] }, 86400000] }, 86400000] } } } },
  ]);
  const lopMap = Object.fromEntries(lopData.map(l => [String(l._id), l.days]));

  let processed = 0, skipped = 0;
  const results = [];

  for (const staff of staffList) {
    const existing = await Payroll.findOne({ tenantId: req.tenantId, staffId: staff._id, month: +month, year: +year });
    if (existing && existing.status !== 'draft') { skipped++; continue; }

    const lopDays = lopMap[String(staff._id)] || 0;
    const basic = staff.salary || 30000;
    const calc = calcGrossAndDeductions(basic, lopDays, workingDays);
    const daysWorked = workingDays - lopDays;

    const payroll = await Payroll.findOneAndUpdate(
      { tenantId: req.tenantId, staffId: staff._id, month: +month, year: +year },
      { $set: { ...calc, daysWorked, lopDays, status: 'draft', tenantId: req.tenantId } },
      { upsert: true, new: true }
    );
    results.push(payroll);
    processed++;
  }

  sendSuccess(res, { processed, skipped, total: staffList.length }, `Payroll processed for ${processed} staff`);
};

// Create / update individual payroll
exports.upsert = async (req, res) => {
  const { staffId, month, year, ...rest } = req.body;
  const p = await Payroll.findOneAndUpdate(
    { tenantId: req.tenantId, staffId, month, year },
    { $set: { ...rest, tenantId: req.tenantId, staffId, month, year } },
    { upsert: true, new: true }
  ).populate('staffId', 'name employeeId designation');
  sendSuccess(res, p, 'Payroll saved');
};

// Mark as paid
exports.markPaid = async (req, res) => {
  const { ids, bankRef } = req.body;
  await Payroll.updateMany(
    { _id: { $in: ids }, tenantId: req.tenantId, status: 'processed' },
    { $set: { status: 'paid', paidAt: new Date(), bankRef: bankRef || '' } }
  );
  sendSuccess(res, null, 'Payroll marked as paid');
};

// Get salary slip for a staff+month+year
exports.salarySlip = async (req, res) => {
  const { staffId, month, year } = req.params;
  const p = await Payroll.findOne({ tenantId: req.tenantId, staffId, month: +month, year: +year }).populate('staffId');
  if (!p) throw new AppError('Payroll not found', 404);
  sendSuccess(res, p);
};

// Payroll stats
exports.stats = async (req, res) => {
  const { month, year } = req.query;
  const filter = { tenantId: req.tenantId };
  if (month) filter.month = +month;
  if (year) filter.year = +year;

  const agg = await Payroll.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 }, totalNet: { $sum: '$netSalary' }, totalGross: { $sum: '$earnings.total' } } },
  ]);
  sendSuccess(res, agg);
};
