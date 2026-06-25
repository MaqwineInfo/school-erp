const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  month: { type: Number, min: 1, max: 12, required: true },
  year: { type: Number, required: true },
  earnings: {
    basic: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    ta: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  deductions: {
    pf: { type: Number, default: 0 },
    esic: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    lop: { type: Number, default: 0 },
    loanEmi: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  netSalary: { type: Number, default: 0 },
  daysWorked: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },
  status: { type: String, enum: ['draft','processed','paid'], default: 'draft' },
  paidAt: { type: Date },
  bankRef: { type: String },
}, { timestamps: true });

payrollSchema.index({ tenantId: 1, staffId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
