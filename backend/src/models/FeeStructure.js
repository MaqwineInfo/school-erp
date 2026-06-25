const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  name: { type: String, required: true },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
  category: { type: String, enum: ['general','rte','staff_ward',''], default: '' },
  components: [{
    name: { type: String, required: true }, // Tuition, Lab, Computer, Library, Sports...
    amount: { type: Number, required: true, default: 0 },
    gstRate: { type: Number, default: 0 }, // 0, 5, 12, 18
    isOptional: { type: Boolean, default: false },
  }],
  installments: [{
    name: { type: String }, // Term 1, Term 2, Monthly April...
    dueDate: { type: Date },
    percentage: { type: Number }, // % of total
  }],
  lateFeePerDay: { type: Number, default: 0 },
  lateFeeGraceDays: { type: Number, default: 7 },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

feeStructureSchema.index({ tenantId: 1, academicYearId: 1, standardId: 1 });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
