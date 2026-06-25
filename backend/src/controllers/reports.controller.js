const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const FeePayment = require('../models/FeePayment');
const FeeDemand = require('../models/FeeDemand');
const MarksEntry = require('../models/MarksEntry');
const Staff = require('../models/Staff');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const Standard = require('../models/Standard');
const { sendSuccess } = require('../shared/response');
const { exportStudents, exportFeeCollection, exportAttendance, exportPayroll } = require('../utils/excelExporter');
const Tenant = require('../models/Tenant');

// ─── Student Reports ─────────────────────────────────────────────────────────
exports.studentStrength = async (req, res) => {
  const { academicYearId } = req.query;
  const filter = { tenantId: req.tenantId, status: 'active' };
  if (academicYearId) filter.academicYearId = academicYearId;

  const byClass = await Student.aggregate([
    { $match: filter },
    { $group: { _id: { standardId: '$standardId', divisionName: '$divisionName' }, count: { $sum: 1 }, male: { $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] } }, female: { $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] } } } },
    { $sort: { '_id.standardId': 1, '_id.divisionName': 1 } },
  ]);
  const total = await Student.countDocuments(filter);
  const byCategory = await Student.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  const byGender = await Student.aggregate([{ $match: filter }, { $group: { _id: '$gender', count: { $sum: 1 } } }]);
  const newAdmissions = await Student.countDocuments({ ...filter, admissionDate: { $gte: new Date(new Date().getFullYear(), 3, 1) } });

  sendSuccess(res, { byClass, total, byCategory, byGender, newAdmissions });
};

exports.exportStudents = async (req, res) => {
  const { standardId, divisionName, status = 'active' } = req.query;
  const filter = { tenantId: req.tenantId, status };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;

  const students = await Student.find(filter).populate('standardId', 'name').sort({ 'standardId': 1, divisionName: 1, rollNo: 1 }).lean();
  const tenant = await Tenant.findById(req.tenantId).select('name').lean();

  const mapped = students.map(s => ({ ...s, standardName: s.standardId?.name, admissionNo: s.admissionNo }));
  const buffer = await exportStudents({ students: mapped, tenantName: tenant?.name });

  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="students.xlsx"' });
  res.send(buffer);
};

// ─── Attendance Reports ───────────────────────────────────────────────────────
exports.attendanceSummary = async (req, res) => {
  const { standardId, divisionName, month, year } = req.query;
  if (!month || !year) return res.json({ success: false, message: 'month and year required' });

  const start = new Date(+year, +month - 1, 1);
  const end = new Date(+year, +month, 0);

  const filter = { tenantId: req.tenantId, date: { $gte: start, $lte: end } };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;

  const records = await Attendance.find(filter);
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const avgPct = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

  const byDate = await Attendance.aggregate([
    { $match: filter },
    { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
  ]);

  sendSuccess(res, { total, present, absent, late, avgPct, byDate });
};

exports.defaulterAttendance = async (req, res) => {
  const { standardId, divisionName, month, year, threshold = 75 } = req.query;
  const start = new Date(+year, +month - 1, 1);
  const end = new Date(+year, +month, 0);

  const filter = { tenantId: req.tenantId, date: { $gte: start, $lte: end } };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;

  const records = await Attendance.find(filter);
  const students = {};
  records.forEach(r => {
    const id = String(r.studentId);
    if (!students[id]) students[id] = { present: 0, total: 0 };
    students[id].total++;
    if (r.status === 'present' || r.status === 'late') students[id].present++;
  });

  const defaulters = Object.entries(students)
    .map(([id, s]) => ({ studentId: id, present: s.present, total: s.total, pct: s.total ? ((s.present / s.total) * 100).toFixed(1) : 0 }))
    .filter(s => parseFloat(s.pct) < +threshold);

  // Populate names
  const ids = defaulters.map(d => d.studentId);
  const studentsData = await Student.find({ _id: { $in: ids } }).select('name admissionNo standardId divisionName').lean();
  const nameMap = Object.fromEntries(studentsData.map(s => [String(s._id), s]));

  const result = defaulters.map(d => ({ ...d, student: nameMap[d.studentId] })).sort((a, b) => a.pct - b.pct);
  sendSuccess(res, result);
};

// ─── Fee Reports ──────────────────────────────────────────────────────────────
exports.feeCollection = async (req, res) => {
  const { from, to, mode, standardId } = req.query;
  const filter = { tenantId: req.tenantId };
  if (from || to) { filter.paidAt = {}; if (from) filter.paidAt.$gte = new Date(from); if (to) filter.paidAt.$lte = new Date(to); }
  if (mode) filter.method = mode;

  const payments = await FeePayment.find(filter).populate('studentId', 'name admissionNo standardId divisionName').sort({ paidAt: -1 }).lean();
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const byMode = await FeePayment.aggregate([{ $match: filter }, { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } }]);

  sendSuccess(res, { payments, total, count: payments.length, byMode });
};

exports.feeDefaulters = async (req, res) => {
  const { academicYearId, standardId } = req.query;
  const filter = { tenantId: req.tenantId, status: { $in: ['pending', 'partial', 'overdue'] }, deletedAt: null };
  if (academicYearId) filter.academicYearId = academicYearId;

  const demands = await FeeDemand.find(filter).populate('studentId', 'name admissionNo standardId divisionName').sort({ dueDate: 1 }).lean();
  const totalDue = demands.reduce((s, d) => s + d.totalDue, 0);

  sendSuccess(res, { demands, totalDue, count: demands.length });
};

// ─── HR Reports ───────────────────────────────────────────────────────────────
exports.staffList = async (req, res) => {
  const { department, status = 'true' } = req.query;
  const filter = { tenantId: req.tenantId, isActive: status === 'true' };
  if (department) filter.department = department;

  const staff = await Staff.find(filter).populate('userId', 'email role').sort({ department: 1, name: 1 }).lean();
  const byDept = await Staff.aggregate([{ $match: filter }, { $group: { _id: '$department', count: { $sum: 1 } } }]);

  sendSuccess(res, { staff, byDept, total: staff.length });
};

exports.payrollSummary = async (req, res) => {
  const { month, year } = req.query;
  const filter = { tenantId: req.tenantId };
  if (month) filter.month = +month;
  if (year) filter.year = +year;

  const [agg] = await Payroll.aggregate([
    { $match: filter },
    { $group: { _id: null, totalGross: { $sum: '$earnings.total' }, totalNet: { $sum: '$netSalary' }, totalPf: { $sum: '$deductions.pf' }, totalTds: { $sum: '$deductions.tds' }, count: { $sum: 1 } } },
  ]);

  sendSuccess(res, agg || { totalGross: 0, totalNet: 0, totalPf: 0, totalTds: 0, count: 0 });
};

// ─── Export Excel ─────────────────────────────────────────────────────────────
exports.exportPayroll = async (req, res) => {
  const { month, year } = req.query;
  const filter = { tenantId: req.tenantId, month: +month, year: +year };
  const payrollList = await Payroll.find(filter).populate('staffId', 'name employeeId designation department bankAccount').lean();
  const tenant = await Tenant.findById(req.tenantId).select('name').lean();

  const mapped = payrollList.map(p => ({
    ...p, staffName: p.staffId?.name, employeeId: p.staffId?.employeeId,
    designation: p.staffId?.designation, bankAccount: p.staffId?.bankAccount?.number,
    ifscCode: p.staffId?.bankAccount?.ifsc, paymentMode: 'NEFT',
  }));

  const buffer = await exportPayroll({ payrollList: mapped, tenantName: tenant?.name, month: +month, year: +year });
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="payroll-${month}-${year}.xlsx"` });
  res.send(buffer);
};
