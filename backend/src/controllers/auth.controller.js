const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const buildTokenPayload = (user) => ({
  userId: user._id,
  tenantId: user.tenantId,
  branchId: user.branchId,
  role: user.role,
  email: user.email,
  name: user.name,
  studentId: user.studentId || null,
  linkedStudentIds: user.linkedStudentIds || [],
});

exports.login = async (req, res, next) => {
  const { email, password, tenantSlug } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  let tenantId = null;
  if (tenantSlug) {
    const tenant = await Tenant.findOne({ slug: tenantSlug, deletedAt: null });
    if (!tenant) throw new AppError('School not found', 404);
    if (tenant.status === 'suspended') throw new AppError('School account suspended', 403);
    tenantId = tenant._id;
  }

  const filter = { email: email.toLowerCase(), deletedAt: null };
  if (tenantId) filter.tenantId = tenantId;

  const user = await User.findOne(filter).select('+passwordHash');
  if (!user) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('Account deactivated. Contact your administrator.', 403);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError('Invalid email or password', 401);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(buildTokenPayload(user));

  const userData = user.toObject();
  delete userData.passwordHash;

  // Fetch full RBAC permission matrix for this role from Permission collection
  const rbacPermissions = await Permission.find({ role: user.role }).lean();

  // Build a clean map: { module: { canView, canAdd, canEdit, canDelete, canApprove, canExport, branchScope, dataScope, studentScope } }
  const permissionMap = {};
  for (const p of rbacPermissions) {
    permissionMap[p.module] = {
      canView: p.canView,
      canAdd: p.canAdd,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
      canApprove: p.canApprove,
      canExport: p.canExport,
      branchScope: p.branchScope,
      dataScope: p.dataScope,
      studentScope: p.studentScope,
    };
  }

  // Legacy permissions array (kept for backward compat)
  let permissions = [];
  if (user.roleId) {
    const role = await Role.findById(user.roleId).select('permissions').lean();
    if (role) permissions = role.permissions;
  }

  // Fetch tenant enabled modules
  let enabledModules = [];
  if (user.tenantId) {
    const tenant = await Tenant.findById(user.tenantId).select('enabledModules').lean();
    if (tenant) enabledModules = tenant.enabledModules || [];
  }

  // Write login audit log (non-blocking)
  AuditLog.create({
    tenantId: user.tenantId,
    branchId: user.branchId,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    userName: user.name,
    module: 'auth',
    action: 'login',
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    severity: 'info',
    tags: ['authentication'],
  }).catch(() => {});

  sendSuccess(res, { token, user: userData, permissions, permissionMap, enabledModules }, 'Login successful');
};

exports.register = async (req, res, next) => {
  const { name, email, password, tenantSlug, role = 'teacher' } = req.body;
  if (!name || !email || !password) throw new AppError('Name, email and password required', 400);

  let tenantId = null;
  if (tenantSlug) {
    const tenant = await Tenant.findOne({ slug: tenantSlug, deletedAt: null });
    if (!tenant) throw new AppError('School not found', 404);
    tenantId = tenant._id;
  }

  const exists = await User.findOne({ email: email.toLowerCase(), tenantId, deletedAt: null });
  if (exists) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, tenantId, role });

  const token = signToken(buildTokenPayload(user));
  const userData = user.toObject();
  delete userData.passwordHash;

  sendSuccess(res, { token, user: userData }, 'Registered successfully', 201);
};

exports.me = async (req, res, next) => {
  const user = await User.findById(req.user.userId).populate('tenantId', 'name logo primaryColor');
  if (!user) throw new AppError('User not found', 404);
  sendSuccess(res, user);
};

exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords are required', 400);
  if (newPassword.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  const user = await User.findById(req.user.userId).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404);

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, null, 'Password changed successfully');
};
