const SmsLog = require('../models/SmsLog');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, type } = req.query;
  const filter = { tenantId: req.tenantId };
  if (status) filter.status = status;
  if (type) filter.type = type;

  const [items, total] = await Promise.all([
    SmsLog.find(filter).populate('sentBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    SmsLog.countDocuments(filter),
  ]);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.send = async (req, res) => {
  const { type = 'sms', message, audience, standardId, recipientIds, templateName } = req.body;
  if (!message) throw new AppError('Message is required', 400);

  let recipients = [];

  if (audience === 'all_parents' || audience === 'class_parents') {
    const filter = { tenantId: req.tenantId, status: 'active' };
    if (audience === 'class_parents' && standardId) filter.standardId = standardId;
    const students = await Student.find(filter).select('name guardians');
    students.forEach(s => {
      const parent = s.guardians?.[0];
      if (parent?.phone) recipients.push({ phone: parent.phone, name: parent.name, studentId: s._id, status: 'sent' });
    });
  } else if (audience === 'all_staff') {
    const staffList = await Staff.find({ tenantId: req.tenantId, isActive: true }).select('name phone');
    staffList.forEach(s => { if (s.phone) recipients.push({ phone: s.phone, name: s.name, staffId: s._id, status: 'sent' }); });
  } else if (audience === 'custom' && Array.isArray(recipientIds)) {
    recipients = recipientIds.map(r => ({ phone: r.phone, name: r.name, status: 'sent' }));
  }

  const log = await SmsLog.create({
    tenantId: req.tenantId, type, message, audience, standardId, templateName,
    recipients, totalCount: recipients.length, sentCount: recipients.length,
    sentBy: req.user.userId, sentAt: new Date(), status: 'sent',
  });

  sendSuccess(res, log, `${type.toUpperCase()} sent to ${recipients.length} recipients`, 201);
};

exports.stats = async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayCount, monthCount, total] = await Promise.all([
    SmsLog.aggregate([{ $match: { tenantId: req.tenantId, sentAt: { $gte: today } } }, { $group: { _id: null, count: { $sum: '$sentCount' } } }]),
    SmsLog.aggregate([{ $match: { tenantId: req.tenantId, sentAt: { $gte: monthStart } } }, { $group: { _id: null, count: { $sum: '$sentCount' } } }]),
    SmsLog.aggregate([{ $match: { tenantId: req.tenantId } }, { $group: { _id: '$type', count: { $sum: '$sentCount' } } }]),
  ]);

  sendSuccess(res, {
    today: todayCount[0]?.count || 0,
    month: monthCount[0]?.count || 0,
    byType: total,
  });
};
