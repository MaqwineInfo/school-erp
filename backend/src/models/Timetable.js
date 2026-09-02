const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  divisionName: { type: String, required: true },
  /** Phase 3 (ADR-03): the stable academic-group reference. The legacy standardId +
   * divisionName pair is retained during the dual-write window and dropped afterwards. */
  academicGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup', index: true },
  isActive: { type: Boolean, default: true },
  slots: [{
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Mon
    periodNo: { type: Number, required: true },
    startTime: { type: String },
    endTime: { type: String },
    type: { type: String, enum: ['subject','recess','lunch','assembly','free','pt'], default: 'subject' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    room: { type: String },
  }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

timetableSchema.index({ tenantId: 1, academicYearId: 1, standardId: 1, divisionName: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
