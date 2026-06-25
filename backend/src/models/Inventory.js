const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['furniture', 'electronics', 'stationery', 'sports', 'lab', 'library', 'housekeeping', 'uniform', 'other'], default: 'other' },
  itemCode: { type: String },
  description: { type: String },
  unit: { type: String, default: 'nos' },
  totalQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
  issuedQuantity: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  vendor: { type: String },
  location: { type: String },
  lastPurchasedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

inventorySchema.index({ tenantId: 1, category: 1 });
module.exports = mongoose.model('Inventory', inventorySchema);
