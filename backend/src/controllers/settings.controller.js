const Tenant = require('../models/Tenant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');

// ── School Profile ────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  const tenant = await Tenant.findById(req.tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);
  sendSuccess(res, tenant);
};

exports.updateProfile = async (req, res) => {
  const allowedFields = ['name', 'tagline', 'address', 'city', 'state', 'pinCode', 'phone', 'email', 'website', 'affiliationNo', 'udiseCode', 'established', 'managementType', 'primaryColor', 'secondaryColor', 'settings'];
  const update = {};
  allowedFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

  const tenant = await Tenant.findByIdAndUpdate(req.tenantId, { $set: update }, { new: true });
  sendSuccess(res, tenant, 'Profile updated');
};

exports.updateModules = async (req, res) => {
  const { enabledModules } = req.body;
  if (!Array.isArray(enabledModules)) throw new AppError('enabledModules array required', 400);
  const tenant = await Tenant.findByIdAndUpdate(req.tenantId, { $set: { enabledModules } }, { new: true });
  sendSuccess(res, tenant, 'Modules updated');
};

// ── User Management ───────────────────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { role, isActive, search } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ name: 1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  sendSuccess(res, users, null, 200, buildPaginationMeta(total, page, limit));
};

exports.createUser = async (req, res) => {
  const { name, email, phone, role, password, branchId } = req.body;
  if (!email || !password || !role) throw new AppError('email, password and role required', 400);

  const exists = await User.findOne({ email: email.toLowerCase(), tenantId: req.tenantId });
  if (exists) throw new AppError('Email already exists', 409);

  const user = await User.create({ name, email: email.toLowerCase(), phone, role, tenantId: req.tenantId, branchId, isActive: true });
  await user.setPassword(password);
  await user.save({ validateBeforeSave: false });

  const userData = user.toObject(); delete userData.passwordHash;
  sendSuccess(res, userData, 'User created', 201);
};

exports.updateUser = async (req, res) => {
  const { password, ...rest } = req.body;
  const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!user) throw new AppError('User not found', 404);

  Object.assign(user, rest);
  if (password) await user.setPassword(password);
  await user.save({ validateBeforeSave: false });

  const userData = user.toObject(); delete userData.passwordHash;
  sendSuccess(res, userData, 'User updated');
};

exports.toggleActive = async (req, res) => {
  const user = await User.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, [{ $set: { isActive: { $not: '$isActive' } } }], { new: true });
  if (!user) throw new AppError('User not found', 404);
  sendSuccess(res, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
};

exports.deleteUser = async (req, res) => {
  await User.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date(), isActive: false } });
  sendSuccess(res, null, 'User deleted');
};
