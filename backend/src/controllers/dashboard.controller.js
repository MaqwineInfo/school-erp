const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Enquiry = require('../models/Enquiry');
const FeePayment = require('../models/FeePayment');
const FeeDemand = require('../models/FeeDemand');
const Attendance = require('../models/Attendance');
const { sendSuccess } = require('../shared/response');

exports.principalDashboard = async (req, res) => {
  const tid = req.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalStudents,
    activeStudents,
    totalStaff,
    newEnquiries,
    todayCollection,
    monthCollection,
    totalDefaulters,
  ] = await Promise.all([
    Student.countDocuments({ tenantId: tid, deletedAt: null }),
    Student.countDocuments({ tenantId: tid, status: 'active', deletedAt: null }),
    Staff.countDocuments({ tenantId: tid, isActive: true, deletedAt: null }),
    Enquiry.countDocuments({ tenantId: tid, status: 'new', deletedAt: null }),
    FeePayment.aggregate([
      { $match: { tenantId: tid, paidAt: { $gte: today, $lt: tomorrow }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    FeePayment.aggregate([
      { $match: { tenantId: tid, paidAt: { $gte: monthStart }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    FeeDemand.countDocuments({ tenantId: tid, status: { $in: ['pending','overdue'] }, deletedAt: null }),
  ]);

  // Last 7 days collection
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const d2 = new Date(d);
    d2.setDate(d.getDate() + 1);
    const r = await FeePayment.aggregate([
      { $match: { tenantId: tid, paidAt: { $gte: d, $lt: d2 }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    last7.push({ date: d.toISOString().slice(0,10), amount: r[0]?.total || 0 });
  }

  sendSuccess(res, {
    students: { total: totalStudents, active: activeStudents },
    staff: { total: totalStaff },
    enquiries: { new: newEnquiries },
    fees: {
      todayCollection: todayCollection[0]?.total || 0,
      monthCollection: monthCollection[0]?.total || 0,
      defaulters: totalDefaulters,
    },
    recentCollection: last7,
  });
};

exports.studentDashboard = async (req, res) => {
  // For parent / student role - return their child's info
  sendSuccess(res, { message: 'Student dashboard coming soon' });
};
