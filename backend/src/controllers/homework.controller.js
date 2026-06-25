const Homework = require('../models/Homework');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');
const { applyClassScopeForPortal } = require('../middleware/studentScope');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { standardId, divisionName, subjectId, teacherId, type, from, to } = req.query;

  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;
  if (subjectId) filter.subjectId = subjectId;
  if (teacherId) filter.teacherId = teacherId;
  if (type) filter.type = type;
  if (from || to) {
    filter.dueDate = {};
    if (from) filter.dueDate.$gte = new Date(from);
    if (to) filter.dueDate.$lte = new Date(to);
  }

  await applyClassScopeForPortal(req, filter);

  const [items, total] = await Promise.all([
    Homework.find(filter)
      .populate('standardId', 'name shortName')
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name')
      .sort({ dueDate: -1 })
      .skip(skip).limit(limit),
    Homework.countDocuments(filter),
  ]);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const hw = await Homework.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null })
    .populate('standardId', 'name')
    .populate('subjectId', 'name code')
    .populate('teacherId', 'name email');
  if (!hw) throw new AppError('Homework not found', 404);
  sendSuccess(res, hw);
};

exports.create = async (req, res) => {
  const hw = await Homework.create({ ...req.body, tenantId: req.tenantId, branchId: req.user?.branchId, teacherId: req.body.teacherId || req.user.userId });
  sendSuccess(res, hw, 'Homework created', 201);
};

exports.update = async (req, res) => {
  const hw = await Homework.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body }, { new: true }
  );
  if (!hw) throw new AppError('Homework not found', 404);
  sendSuccess(res, hw, 'Homework updated');
};

exports.remove = async (req, res) => {
  const hw = await Homework.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  if (!hw) throw new AppError('Homework not found', 404);
  sendSuccess(res, null, 'Homework deleted');
};
