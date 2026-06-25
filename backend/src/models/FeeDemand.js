const mongoose = require('mongoose');

const feeDemandSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
  installmentName: { type: String },
  dueDate: { type: Date },
  components: [{
    name: { type: String },
    amount: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    due: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
  }],
  totalAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  totalDue: { type: Number, default: 0 },
  concessionAmount: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  status: { type: String, enum: ['pending','partial','paid','overdue','waived'], default: 'pending' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

feeDemandSchema.index({ tenantId: 1, studentId: 1, status: 1 });
feeDemandSchema.index({ tenantId: 1, dueDate: 1, status: 1 });

module.exports = mongoose.model('FeeDemand', feeDemandSchema);
