const mongoose = require('mongoose');

/**
 * Department — what `dataScope: 'department'` actually resolves against.
 *
 * The RBAC document gives an HoD `dataScope: 'department'`, but no Department entity
 * existed, so the dimension could never be enforced. Subjects and staff belong to one.
 */
const departmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    name: { type: String, required: true, trim: true }, // Science, Commerce, Languages
    code: { type: String, trim: true, uppercase: true },
    headId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
departmentSchema.index({ tenantId: 1, headId: 1 });

module.exports = mongoose.model('Department', departmentSchema);
