const MealMenu = require('../models/MealMenu');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

exports.list = async (req, res) => {
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const items = await MealMenu.find(filter).sort({ date: -1 });
  sendSuccess(res, items);
};

exports.create = async (req, res) => {
  const item = await MealMenu.create({ ...req.body, tenantId: req.tenantId, date: new Date(req.body.date) });
  sendSuccess(res, item, 'Menu added', 201);
};

exports.update = async (req, res) => {
  const body = { ...req.body };
  if (body.date) body.date = new Date(body.date);
  const item = await MealMenu.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: body },
    { new: true }
  );
  if (!item) throw new AppError('Menu not found', 404);
  sendSuccess(res, item, 'Updated');
};

exports.remove = async (req, res) => {
  await MealMenu.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  sendSuccess(res, null, 'Deleted');
};
