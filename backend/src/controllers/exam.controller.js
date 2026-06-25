const Exam = require('../models/Exam');
const MarksEntry = require('../models/MarksEntry');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, academicYearId, type, status } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (academicYearId) filter.academicYearId = academicYearId;
  if (type) filter.type = type;
  if (status) filter.status = status;
  const [exams, total] = await Promise.all([
    Exam.find(filter).populate('academicYearId', 'name').sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit),
    Exam.countDocuments(filter),
  ]);
  sendSuccess(res, exams, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null })
    .populate('schedules.standardId', 'name')
    .populate('schedules.subjectId', 'name')
    .populate('schedules.invigilatorId', 'name');
  if (!exam) throw new AppError('Exam not found', 404);
  sendSuccess(res, exam);
};

exports.create = async (req, res) => {
  const exam = await Exam.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, exam, 'Exam created', 201);
};

exports.update = async (req, res) => {
  const exam = await Exam.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }, { $set: req.body }, { new: true });
  if (!exam) throw new AppError('Exam not found', 404);
  sendSuccess(res, exam, 'Exam updated');
};

exports.publish = async (req, res) => {
  const exam = await Exam.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { status: 'published' } }, { new: true });
  if (!exam) throw new AppError('Exam not found', 404);
  sendSuccess(res, exam, 'Exam published');
};

exports.remove = async (req, res) => {
  await Exam.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Exam deleted');
};

// Marks
exports.enterMarks = async (req, res) => {
  const { examId, subjectId, marks } = req.body;
  if (!Array.isArray(marks)) throw new AppError('marks must be an array', 400);

  const ops = marks.map(m => ({
    updateOne: {
      filter: { tenantId: req.tenantId, examId, studentId: m.studentId, subjectId },
      update: {
        $set: {
          marksObtained: m.marksObtained,
          maxMarks: m.maxMarks || 100,
          isAbsent: m.isAbsent || false,
          remarks: m.remarks,
          grade: m.grade,
          enteredBy: req.user.userId,
          status: 'submitted',
        },
      },
      upsert: true,
    },
  }));

  await MarksEntry.bulkWrite(ops);
  sendSuccess(res, null, 'Marks saved');
};

exports.getMarks = async (req, res) => {
  const { examId, standardId, subjectId, studentId } = req.query;
  const filter = { tenantId: req.tenantId, examId };
  if (subjectId) filter.subjectId = subjectId;
  if (studentId) filter.studentId = studentId;
  const marks = await MarksEntry.find(filter).populate('studentId', 'name admissionNo rollNo').populate('subjectId', 'name');
  sendSuccess(res, marks);
};

exports.resultCard = async (req, res) => {
  const { studentId } = req.params;
  const { examId } = req.query;
  const marks = await MarksEntry.find({ tenantId: req.tenantId, studentId, examId })
    .populate('subjectId', 'name maxMarks passMarks type')
    .populate('examId', 'name type');
  sendSuccess(res, marks);
};
