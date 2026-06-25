const Event = require('../models/Event');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

exports.list = async (req, res) => {
  const { from, to, type, audience } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (type) filter.type = type;
  if (audience && audience !== 'all') filter.audience = { $in: [audience, 'all'] };
  if (from || to) {
    filter.startDate = {};
    if (from) filter.startDate.$gte = new Date(from);
    if (to) filter.startDate.$lte = new Date(to);
  }
  const events = await Event.find(filter).populate('createdBy', 'name').sort({ startDate: 1 });
  sendSuccess(res, events);
};

exports.create = async (req, res) => {
  const event = await Event.create({ ...req.body, tenantId: req.tenantId, branchId: req.user?.branchId, createdBy: req.user.userId });
  sendSuccess(res, event, 'Event created', 201);
};

exports.update = async (req, res) => {
  const event = await Event.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!event) throw new AppError('Event not found', 404);
  sendSuccess(res, event, 'Event updated');
};

exports.remove = async (req, res) => {
  await Event.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Event deleted');
};

exports.upcoming = async (req, res) => {
  const events = await Event.find({ tenantId: req.tenantId, startDate: { $gte: new Date() }, deletedAt: null }).sort({ startDate: 1 }).limit(10);
  sendSuccess(res, events);
};
