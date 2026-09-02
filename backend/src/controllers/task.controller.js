const Task = require('../models/Task');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

exports.list = async (req, res) => {
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  const items = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .populate('assignedBy', 'name')
    .sort({ dueDate: 1, createdAt: -1 });
  sendSuccess(res, items);
};

exports.create = async (req, res) => {
  const item = await Task.create({
    ...req.body,
    tenantId: req.tenantId,
    assignedBy: req.user.userId,
  });
  sendSuccess(res, item, 'Task created', 201);
};

exports.update = async (req, res) => {
  const item = await Task.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body },
    { new: true }
  );
  if (!item) throw new AppError('Task not found', 404);
  sendSuccess(res, item, 'Updated');
};

exports.remove = async (req, res) => {
  await Task.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  sendSuccess(res, null, 'Deleted');
};
