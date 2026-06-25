const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true }, // e.g. "2026-27"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: false },
  terms: [{
    name: { type: String }, // Term 1, Term 2
    startDate: { type: Date },
    endDate: { type: Date },
  }],
  holidays: [{
    name: { type: String },
    date: { type: Date },
    type: { type: String, enum: ['national','religious','regional','school'], default: 'school' },
  }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

academicYearSchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
