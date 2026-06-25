const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  demandId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeDemand' },
  receiptNo: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash','cheque','dd','neft','rtgs','upi','card','net_banking','other'], default: 'cash' },
  gatewayTxnId: { type: String },
  gatewayRef: { type: String },
  chequeNo: { type: String },
  bankName: { type: String },
  remarks: { type: String },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

feePaymentSchema.index({ tenantId: 1, studentId: 1 });
feePaymentSchema.index({ tenantId: 1, receiptNo: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
feePaymentSchema.index({ tenantId: 1, paidAt: -1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
