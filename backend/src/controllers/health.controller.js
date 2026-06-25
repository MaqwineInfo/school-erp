const HealthRecord = require('../models/HealthRecord');
const Student = require('../models/Student');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { studentId, type, standardId } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (studentId) filter.studentId = studentId;
  if (type) filter.type = type;
  if (standardId && !studentId) {
    const students = await Student.find({ tenantId: req.tenantId, standardId }).select('_id');
    filter.studentId = { $in: students.map(s => s._id) };
  }

  const [items, total] = await Promise.all([
    HealthRecord.find(filter).populate('studentId', 'name admissionNo standardId divisionName').populate('recordedBy', 'name').sort({ date: -1 }).skip(skip).limit(limit),
    HealthRecord.countDocuments(filter),
  ]);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.create = async (req, res) => {
  const record = await HealthRecord.create({ ...req.body, tenantId: req.tenantId, recordedBy: req.user.userId });
  if (req.body.height && req.body.weight) {
    const heightM = req.body.height / 100;
    record.bmi = parseFloat((req.body.weight / (heightM * heightM)).toFixed(1));
    await record.save();
  }
  sendSuccess(res, record, 'Health record added', 201);
};

exports.update = async (req, res) => {
  const record = await HealthRecord.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!record) throw new AppError('Record not found', 404);
  sendSuccess(res, record, 'Updated');
};

exports.remove = async (req, res) => {
  await HealthRecord.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Deleted');
};

exports.studentSummary = async (req, res) => {
  const { studentId } = req.params;
  const records = await HealthRecord.find({ tenantId: req.tenantId, studentId, deletedAt: null }).sort({ date: -1 });
  const latest = records[0];
  sendSuccess(res, { records, latest });
};
