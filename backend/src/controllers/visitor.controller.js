const Visitor = require('../models/Visitor');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { date, search, status } = req.query;

  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }];
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    filter.checkIn = { $gte: d, $lt: next };
  }
  if (status === 'in') filter.checkOut = null;
  if (status === 'out') filter.checkOut = { $ne: null };

  const [items, total] = await Promise.all([
    Visitor.find(filter).populate('studentId', 'name admissionNo').populate('createdBy', 'name').sort({ checkIn: -1 }).skip(skip).limit(limit),
    Visitor.countDocuments(filter),
  ]);

  // Today's stats
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const [todayIn, todayOut] = await Promise.all([
    Visitor.countDocuments({ tenantId: req.tenantId, checkIn: { $gte: today, $lt: tomorrow } }),
    Visitor.countDocuments({ tenantId: req.tenantId, checkIn: { $gte: today, $lt: tomorrow }, checkOut: { $ne: null } }),
  ]);

  sendSuccess(res, { items, stats: { todayIn, todayOut, currentlyIn: todayIn - todayOut } }, null, 200, buildPaginationMeta(total, page, limit));
};

exports.checkIn = async (req, res) => {
  const { name, phone, purpose, toMeet, idProofType, idProofNo, studentId } = req.body;
  if (!name) throw new AppError('Visitor name required', 400);

  const gatePassNo = `GP${Date.now().toString(36).toUpperCase()}`;
  const visitor = await Visitor.create({
    tenantId: req.tenantId, branchId: req.user?.branchId,
    name, phone, purpose, toMeet, idProofType, idProofNo, studentId,
    gatePassNo, checkIn: new Date(), createdBy: req.user.userId,
  });
  sendSuccess(res, visitor, `Gate Pass: ${gatePassNo}`, 201);
};

exports.checkOut = async (req, res) => {
  const visitor = await Visitor.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, checkOut: null },
    { $set: { checkOut: new Date() } }, { new: true }
  );
  if (!visitor) throw new AppError('Visitor not found or already checked out', 400);
  const duration = Math.round((visitor.checkOut - visitor.checkIn) / 60000);
  sendSuccess(res, { ...visitor.toObject(), durationMins: duration }, 'Checked out successfully');
};

exports.get = async (req, res) => {
  const v = await Visitor.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate('studentId', 'name admissionNo standardId divisionName');
  if (!v) throw new AppError('Visitor not found', 404);
  sendSuccess(res, v);
};
