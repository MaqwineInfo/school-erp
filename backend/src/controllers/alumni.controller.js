const Alumni = require('../models/Alumni');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

exports.list = async (req, res) => {
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { batch: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const items = await Alumni.find(filter).sort({ createdAt: -1 });
  sendSuccess(res, items);
};

exports.create = async (req, res) => {
  const item = await Alumni.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, item, 'Alumni added', 201);
};

exports.update = async (req, res) => {
  const item = await Alumni.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body },
    { new: true }
  );
  if (!item) throw new AppError('Alumni not found', 404);
  sendSuccess(res, item, 'Updated');
};

exports.remove = async (req, res) => {
  await Alumni.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  sendSuccess(res, null, 'Deleted');
};
