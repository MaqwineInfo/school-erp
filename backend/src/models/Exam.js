const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['unit_test','half_yearly','annual','pre_board','practical','project','mcq','internal'], default: 'unit_test' },
  status: { type: String, enum: ['draft','published','completed'], default: 'draft' },
  schedules: [{
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    date: { type: Date },
    startTime: { type: String },
    duration: { type: Number }, // minutes
    maxMarks: { type: Number, default: 100 },
    room: { type: String },
    invigilatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

examSchema.index({ tenantId: 1, academicYearId: 1, type: 1 });

module.exports = mongoose.model('Exam', examSchema);
