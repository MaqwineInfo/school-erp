const Inventory = require('../models/Inventory');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, search } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (category) filter.category = category;
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { itemCode: { $regex: search, $options: 'i' } }];

  const [items, total] = await Promise.all([
    Inventory.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limit),
    Inventory.countDocuments(filter),
  ]);

  const lowStock = items.filter(i => i.availableQuantity <= i.minStock && i.minStock > 0).length;
  sendSuccess(res, { items, lowStock }, null, 200, buildPaginationMeta(total, page, limit));
};

exports.create = async (req, res) => {
  const item = await Inventory.create({ ...req.body, tenantId: req.tenantId, branchId: req.user?.branchId });
  sendSuccess(res, item, 'Item added', 201);
};

exports.update = async (req, res) => {
  const item = await Inventory.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!item) throw new AppError('Item not found', 404);
  sendSuccess(res, item, 'Item updated');
};

exports.adjustStock = async (req, res) => {
  const { quantity, type, reason } = req.body; // type: 'add' | 'issue' | 'return' | 'damage'
  const item = await Inventory.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!item) throw new AppError('Item not found', 404);

  if (type === 'add') {
    item.totalQuantity += quantity;
    item.availableQuantity += quantity;
  } else if (type === 'issue') {
    if (item.availableQuantity < quantity) throw new AppError('Insufficient stock', 400);
    item.availableQuantity -= quantity;
    item.issuedQuantity += quantity;
  } else if (type === 'return') {
    item.availableQuantity += quantity;
    item.issuedQuantity = Math.max(0, item.issuedQuantity - quantity);
  } else if (type === 'damage') {
    item.totalQuantity -= quantity;
    item.availableQuantity -= quantity;
  }
  await item.save();
  sendSuccess(res, item, 'Stock adjusted');
};

exports.remove = async (req, res) => {
  await Inventory.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Item deleted');
};

exports.stats = async (req, res) => {
  const byCategory = await Inventory.aggregate([
    { $match: { tenantId: req.tenantId, deletedAt: null } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$totalQuantity', '$purchasePrice'] } } } },
  ]);
  const lowStock = await Inventory.countDocuments({ tenantId: req.tenantId, deletedAt: null, $expr: { $lte: ['$availableQuantity', '$minStock'] } });
  sendSuccess(res, { byCategory, lowStock });
};
