const mongoose = require('mongoose');

/**
 * Custom role with granular module-level permissions.
 * Every tenant can have their own roles (e.g. "Sports Teacher", "Lab Incharge").
 * System roles (principal, teacher, etc.) are seeded automatically on tenant creation.
 */

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

const permissionSchema = new mongoose.Schema({
  module: { type: String, required: true },
  actions: [{ type: String, enum: ACTIONS }],
}, { _id: false });

const roleSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }, // null = system role
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  description: { type: String },
  isSystem: { type: Boolean, default: false }, // system roles can't be deleted
  isSuperAdmin: { type: Boolean, default: false },
  permissions: [permissionSchema],
  menuAccess: [{ type: String }], // explicit menu/page slugs this role can see
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

roleSchema.index({ tenantId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

roleSchema.statics.ACTIONS = ACTIONS;

module.exports = mongoose.model('Role', roleSchema);
