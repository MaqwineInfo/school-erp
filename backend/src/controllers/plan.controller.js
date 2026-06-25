const Plan = require('../models/Plan');
const Tenant = require('../models/Tenant');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

// List all plans (public — for signup page)
exports.listPublic = async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
  sendSuccess(res, plans);
};

// Super admin: create or update plan
exports.upsert = async (req, res) => {
  const { name } = req.body;
  const existing = await Plan.findOne({ name });
  if (existing) {
    Object.assign(existing, req.body);
    await existing.save();
    return sendSuccess(res, existing, 'Plan updated');
  }
  const plan = await Plan.create(req.body);
  sendSuccess(res, plan, 'Plan created', 201);
};

// Super admin: list all tenants
exports.listTenants = async (req, res) => {
  const { page = 1, limit = 20, status, planName, search } = req.query;
  const filter = { deletedAt: null };
  if (status) filter.status = status;
  if (planName) filter.planName = planName;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { slug: { $regex: search, $options: 'i' } },
    { city: { $regex: search, $options: 'i' } },
  ];

  const skip = (page - 1) * limit;
  const [tenants, total] = await Promise.all([
    Tenant.find(filter).populate('planId', 'displayName').sort({ createdAt: -1 }).skip(skip).limit(+limit),
    Tenant.countDocuments(filter),
  ]);
  sendSuccess(res, tenants, null, 200, { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) });
};

// Super admin: get single tenant details
exports.getTenant = async (req, res) => {
  const tenant = await Tenant.findById(req.params.id).populate('planId');
  if (!tenant) throw new AppError('Tenant not found', 404);
  sendSuccess(res, tenant);
};

// Super admin: update tenant plan or status
exports.updateTenant = async (req, res) => {
  const allowed = ['planName', 'planId', 'status', 'enabledModules', 'featureOverrides', 'trialEndsAt', 'subscriptionEndDate'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  const tenant = await Tenant.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!tenant) throw new AppError('Tenant not found', 404);
  sendSuccess(res, tenant, 'Tenant updated');
};

// Super admin: suspend / reactivate tenant
exports.toggleStatus = async (req, res) => {
  const { status, reason } = req.body;
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!tenant) throw new AppError('Tenant not found', 404);
  sendSuccess(res, tenant, `Tenant ${status}`);
};

// Super admin: overview stats
exports.saasStats = async (req, res) => {
  const [total, active, trial, suspended, byPlan] = await Promise.all([
    Tenant.countDocuments({ deletedAt: null }),
    Tenant.countDocuments({ status: 'active', deletedAt: null }),
    Tenant.countDocuments({ status: 'trial', deletedAt: null }),
    Tenant.countDocuments({ status: 'suspended', deletedAt: null }),
    Tenant.aggregate([{ $group: { _id: '$planName', count: { $sum: 1 } } }]),
  ]);
  sendSuccess(res, { total, active, trial, suspended, byPlan });
};
