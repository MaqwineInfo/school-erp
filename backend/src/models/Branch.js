const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String },
  phone: { type: String },
  email: { type: String, lowercase: true },
  principalName: { type: String },
  isHeadOffice: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

branchSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

module.exports = mongoose.model('Branch', branchSchema);
