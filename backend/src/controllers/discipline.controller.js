const DisciplineRecord = require('../models/DisciplineRecord');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

exports.list = async (req, res) => {
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (req.query.studentId) filter.studentId = req.query.studentId;
  if (req.query.type) filter.type = req.query.type;
  const records = await DisciplineRecord.find(filter)
    .populate('studentId', 'name admissionNo standardId divisionName')
    .populate('recordedBy', 'name')
    .sort({ date: -1 });
  sendSuccess(res, records);
};

exports.create = async (req, res) => {
  const record = await DisciplineRecord.create({
    ...req.body,
    tenantId: req.tenantId,
    recordedBy: req.user.userId,
  });
  sendSuccess(res, record, 'Record created', 201);
};

exports.update = async (req, res) => {
  const record = await DisciplineRecord.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body },
    { new: true }
  );
  if (!record) throw new AppError('Record not found', 404);
  sendSuccess(res, record, 'Updated');
};

exports.remove = async (req, res) => {
  await DisciplineRecord.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  sendSuccess(res, null, 'Deleted');
};
