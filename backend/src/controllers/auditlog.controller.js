const AuditLog = require('../models/AuditLog');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');
const { AppError } = require('../shared/errors');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { module, action, userId, severity, from, to } = req.query;

  const filter = { tenantId: req.tenantId };
  if (module) filter.module = module;
  if (action) filter.action = action;
  if (userId) filter.userId = userId;
  if (severity) filter.severity = severity;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, logs, null, 200, buildPaginationMeta(total, page, limit));
};

exports.getOne = async (req, res) => {
  const log = await AuditLog.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!log) throw new AppError('Not found', 404);
  sendSuccess(res, log);
};

exports.stats = async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [byModule, bySeverity, recentCritical] = await Promise.all([
    AuditLog.aggregate([
      { $match: { tenantId: req.tenantId, createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.aggregate([
      { $match: { tenantId: req.tenantId, createdAt: { $gte: today } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    AuditLog.find({ tenantId: req.tenantId, severity: 'critical' }).sort({ createdAt: -1 }).limit(10),
  ]);

  sendSuccess(res, { byModule, bySeverity, recentCritical });
};
