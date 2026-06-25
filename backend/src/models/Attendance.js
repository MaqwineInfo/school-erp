const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  divisionName: { type: String, required: true },
  date: { type: Date, required: true },
  isPeriodWise: { type: Boolean, default: false },
  periodNo: { type: Number },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  records: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['present','absent','late','leave','holiday'], default: 'present' },
    remarks: { type: String },
    leaveType: { type: String, enum: ['medical','personal','sanctioned',''] },
  }],
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  markedAt: { type: Date },
}, { timestamps: true });

attendanceSchema.index({ tenantId: 1, standardId: 1, divisionName: 1, date: 1, periodNo: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
