const MarksEntry = require('../models/MarksEntry');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Standard = require('../models/Standard');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');
const { applyStudentScope, assertStudentAccess } = require('../middleware/studentScope');

// CBSE grade mapping
function getGrade(marks, maxMarks) {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

// List marks for a given exam + class + subject
exports.list = async (req, res) => {
  const { examId, standardId, divisionName, subjectId, status } = req.query;
  const filter = { tenantId: req.tenantId };
  if (examId) filter.examId = examId;
  if (subjectId) filter.subjectId = subjectId;
  if (status) filter.status = status;

  // Portal users — restrict to own / linked children
  if (['parent', 'student'].includes(req.user?.role)) {
    const studentFilter = { tenantId: req.tenantId, deletedAt: null };
    applyStudentScope(req, studentFilter);
    const scopedStudents = await Student.find(studentFilter).select('_id');
    filter.studentId = { $in: scopedStudents.map(s => s._id) };
  } else if (standardId) {
    const studentFilter = { tenantId: req.tenantId, standardId };
    if (divisionName) studentFilter.divisionName = divisionName;
    const students = await Student.find(studentFilter).select('_id');
    filter.studentId = { $in: students.map(s => s._id) };
  }

  const entries = await MarksEntry.find(filter)
    .populate('studentId', 'name admissionNo rollNo divisionName')
    .populate('subjectId', 'name code')
    .sort({ 'studentId.rollNo': 1 });

  sendSuccess(res, entries);
};

// Bulk save marks for an exam + class + subject
exports.bulkSave = async (req, res) => {
  const { examId, subjectId, entries } = req.body;
  if (!examId || !subjectId || !Array.isArray(entries)) throw new AppError('examId, subjectId and entries required', 400);

  const results = [];
  for (const entry of entries) {
    const grade = entry.isAbsent ? 'AB' : (entry.marksObtained != null ? getGrade(entry.marksObtained, entry.maxMarks || 100) : '');
    const doc = await MarksEntry.findOneAndUpdate(
      { tenantId: req.tenantId, examId, studentId: entry.studentId, subjectId },
      {
        $set: {
          tenantId: req.tenantId, examId, subjectId,
          marksObtained: entry.isAbsent ? null : entry.marksObtained,
          maxMarks: entry.maxMarks || 100,
          isAbsent: !!entry.isAbsent,
          grade, remarks: entry.remarks || '',
          enteredBy: req.user.userId,
          status: 'submitted',
        }
      },
      { upsert: true, new: true }
    );
    results.push(doc);
  }
  sendSuccess(res, results, `${results.length} marks saved`);
};

// Get report card for a student + exam
exports.reportCard = async (req, res) => {
  const { studentId, examId } = req.params;
  assertStudentAccess(req, studentId);

  const studentFilter = { _id: studentId, tenantId: req.tenantId, deletedAt: null };
  applyStudentScope(req, studentFilter);
  const [student, exam, entries] = await Promise.all([
    Student.findOne(studentFilter).populate('standardId', 'name'),
    Exam.findOne({ _id: examId, tenantId: req.tenantId }),
    MarksEntry.find({ tenantId: req.tenantId, studentId, examId }).populate('subjectId', 'name code type'),
  ]);

  if (!student) throw new AppError('Student not found', 404);

  const totalMarks = entries.reduce((s, e) => s + (e.marksObtained || 0), 0);
  const maxMarks = entries.reduce((s, e) => s + (e.maxMarks || 100), 0);
  const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;
  const overallGrade = getGrade(totalMarks, maxMarks);
  const passed = entries.every(e => e.isAbsent || (e.marksObtained != null && (e.marksObtained / e.maxMarks) * 100 >= 33));

  // Class rank
  const allStudentMarks = await MarksEntry.aggregate([
    { $match: { tenantId: req.tenantId, examId: exam._id } },
    { $group: { _id: '$studentId', total: { $sum: '$marksObtained' } } },
    { $sort: { total: -1 } },
  ]);
  const rank = allStudentMarks.findIndex(r => String(r._id) === String(studentId)) + 1;

  sendSuccess(res, { student, exam, entries, totalMarks, maxMarks, percentage, overallGrade, passed, rank });
};

// Get class result summary
exports.classSummary = async (req, res) => {
  const { examId, standardId, divisionName } = req.query;
  if (!examId || !standardId) throw new AppError('examId and standardId required', 400);

  const students = await Student.find({ tenantId: req.tenantId, standardId, divisionName: divisionName || undefined }).sort({ rollNo: 1 });
  const entries = await MarksEntry.find({ tenantId: req.tenantId, examId, studentId: { $in: students.map(s => s._id) } }).populate('subjectId', 'name code');

  const summary = students.map(student => {
    const studentEntries = entries.filter(e => String(e.studentId) === String(student._id));
    const totalMarks = studentEntries.reduce((s, e) => s + (e.marksObtained || 0), 0);
    const maxMarks = studentEntries.reduce((s, e) => s + (e.maxMarks || 100), 0);
    const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;
    const grade = getGrade(totalMarks, maxMarks);
    const passed = studentEntries.length > 0 && studentEntries.every(e => e.isAbsent || (e.marksObtained != null && (e.marksObtained / e.maxMarks) * 100 >= 33));
    return { student: { _id: student._id, name: student.name, admissionNo: student.admissionNo, rollNo: student.rollNo }, entries: studentEntries, totalMarks, maxMarks, percentage, grade, passed };
  });

  // Assign ranks
  summary.sort((a, b) => b.totalMarks - a.totalMarks);
  summary.forEach((s, i) => { s.rank = i + 1; });
  summary.sort((a, b) => (a.student.rollNo || 0) - (b.student.rollNo || 0));

  const totalStudents = summary.length;
  const passed = summary.filter(s => s.passed).length;
  const failed = totalStudents - passed;
  const classAvg = totalStudents > 0 ? (summary.reduce((s, r) => s + parseFloat(r.percentage), 0) / totalStudents).toFixed(2) : 0;

  sendSuccess(res, { summary, stats: { totalStudents, passed, failed, passPercentage: ((passed / totalStudents) * 100).toFixed(1), classAvg } });
};

// Verify marks (by principal)
exports.verify = async (req, res) => {
  await MarksEntry.updateMany(
    { tenantId: req.tenantId, examId: req.body.examId, subjectId: req.body.subjectId },
    { $set: { status: 'verified', verifiedBy: req.user.userId } }
  );
  sendSuccess(res, null, 'Marks verified');
};
