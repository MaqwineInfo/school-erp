const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');
const { assertStudentAccess } = require('../middleware/studentScope');

exports.mark = async (req, res) => {
  const { standardId, divisionName, date, records, academicYearId, isPeriodWise, periodNo, subjectId } = req.body;

  const filter = { tenantId: req.tenantId, standardId, divisionName, date: new Date(date) };
  if (isPeriodWise && periodNo) filter.periodNo = periodNo;

  const existing = await Attendance.findOne(filter);
  if (existing) {
    existing.records = records;
    existing.markedBy = req.user.userId;
    existing.markedAt = new Date();
    await existing.save();
    return sendSuccess(res, existing, 'Attendance updated');
  }

  const attendance = await Attendance.create({
    tenantId: req.tenantId,
    branchId: req.user.branchId,
    academicYearId,
    standardId,
    divisionName,
    date: new Date(date),
    isPeriodWise: !!isPeriodWise,
    periodNo,
    subjectId,
    records,
    markedBy: req.user.userId,
    markedAt: new Date(),
  });

  sendSuccess(res, attendance, 'Attendance marked', 201);
};

exports.getByDate = async (req, res) => {
  const { standardId, divisionName, date, periodNo } = req.query;
  const filter = { tenantId: req.tenantId, standardId, divisionName, date: new Date(date) };
  if (periodNo) filter.periodNo = +periodNo;

  const attendance = await Attendance.findOne(filter).populate('records.studentId', 'name admissionNo rollNo');
  if (!attendance) {
    const students = await Student.find({ tenantId: req.tenantId, standardId, divisionName, status: 'active', deletedAt: null }).select('_id name admissionNo rollNo');
    return sendSuccess(res, { attendance: null, students });
  }
  sendSuccess(res, { attendance, students: [] });
};

exports.monthly = async (req, res) => {
  const { studentId, month, year } = req.query;
  if (!studentId) throw new AppError('studentId required', 400);
  assertStudentAccess(req, studentId);
  const from = new Date(`${year}-${month}-01`);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);

  const records = await Attendance.find({
    tenantId: req.tenantId,
    date: { $gte: from, $lt: to },
    'records.studentId': studentId,
  }).select('date records');

  const result = records.map(r => ({
    date: r.date,
    status: r.records.find(x => x.studentId.toString() === studentId)?.status || 'absent',
  }));

  sendSuccess(res, result);
};

exports.summary = async (req, res) => {
  const { standardId, divisionName, academicYearId } = req.query;
  const filter = { tenantId: req.tenantId, standardId, divisionName };
  if (academicYearId) filter.academicYearId = academicYearId;

  const docs = await Attendance.find(filter).select('date records');
  const studentMap = {};
  for (const doc of docs) {
    for (const r of doc.records) {
      const sid = r.studentId.toString();
      if (!studentMap[sid]) studentMap[sid] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
      studentMap[sid].total++;
      if (r.status === 'present') studentMap[sid].present++;
      else if (r.status === 'absent') studentMap[sid].absent++;
      else if (r.status === 'late') studentMap[sid].late++;
      else if (r.status === 'leave') studentMap[sid].leave++;
    }
  }
  sendSuccess(res, studentMap);
};
