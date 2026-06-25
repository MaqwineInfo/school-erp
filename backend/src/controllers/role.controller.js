const Role = require('../models/Role');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { clearRoleCache } = require('../middleware/rbac');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

// List all roles for a tenant
exports.list = async (req, res) => {
  const roles = await Role.find({ tenantId: req.tenantId, isActive: true, deletedAt: null }).sort({ isSystem: -1, name: 1 });
  sendSuccess(res, roles);
};

// Get single role
exports.get = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!role) throw new AppError('Role not found', 404);
  sendSuccess(res, role);
};

// Create custom role
exports.create = async (req, res) => {
  const { name, description, permissions, menuAccess } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const exists = await Role.findOne({ tenantId: req.tenantId, slug, deletedAt: null });
  if (exists) throw new AppError('A role with this name already exists', 409);

  const role = await Role.create({ tenantId: req.tenantId, name, slug, description, permissions: permissions || [], menuAccess: menuAccess || [], isSystem: false });
  sendSuccess(res, role, 'Role created', 201);
};

// Update role permissions
exports.update = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!role) throw new AppError('Role not found', 404);
  if (role.isSystem && req.body.permissions) {
    // Allow editing permissions of system roles but not deleting them
  }

  const allowed = ['name', 'description', 'permissions', 'menuAccess', 'isActive'];
  allowed.forEach(k => { if (req.body[k] !== undefined) role[k] = req.body[k]; });
  await role.save();
  clearRoleCache(role._id);
  sendSuccess(res, role, 'Role updated');
};

// Delete custom role (not system roles)
exports.remove = async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!role) throw new AppError('Role not found', 404);
  if (role.isSystem) throw new AppError('System roles cannot be deleted', 400);

  // Re-assign users with this role to default role
  await User.updateMany({ tenantId: req.tenantId, roleId: role._id }, { $unset: { roleId: 1 } });
  role.deletedAt = new Date();
  await role.save();
  clearRoleCache(role._id);
  sendSuccess(res, null, 'Role deleted');
};

// Assign role to user
exports.assignToUser = async (req, res) => {
  const { userId, roleId } = req.body;
  const [user, role] = await Promise.all([
    User.findOne({ _id: userId, tenantId: req.tenantId }),
    Role.findOne({ _id: roleId, tenantId: req.tenantId }),
  ]);
  if (!user) throw new AppError('User not found', 404);
  if (!role) throw new AppError('Role not found', 404);

  user.roleId = role._id;
  user.role = role.slug; // keep role string in sync
  await user.save();
  sendSuccess(res, user, `Role '${role.name}' assigned to ${user.name}`);
};

// Get users by role
exports.getUsersByRole = async (req, res) => {
  const users = await User.find({ tenantId: req.tenantId, roleId: req.params.id, deletedAt: null }).select('-passwordHash');
  sendSuccess(res, users);
};

// Get available modules (for permission matrix UI)
exports.moduleList = async (req, res) => {
  const Plan = require('../models/Plan');
  sendSuccess(res, { modules: Plan.schema.statics?.MODULE_LIST || require('../models/Plan').schema.statics?.MODULE_LIST });
};
