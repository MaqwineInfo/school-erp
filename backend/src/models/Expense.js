const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  category: { type: String, enum: ['salary','utilities','maintenance','stationery','marketing','events','repairs','travel','rent','other'], default: 'other' },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  vendor: { type: String },
  billNo: { type: String },
  billDate: { type: Date },
  billUrl: { type: String },
  paymentMethod: { type: String, enum: ['cash','cheque','neft','upi','card'], default: 'cash' },
  paidAt: { type: Date },
  status: { type: String, enum: ['pending','approved','rejected','paid'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

expenseSchema.index({ tenantId: 1, category: 1, paidAt: -1 });
expenseSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
