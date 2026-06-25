const mongoose = require('mongoose');

const marksEntrySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  marksObtained: { type: Number },
  maxMarks: { type: Number, default: 100 },
  grade: { type: String },
  isAbsent: { type: Boolean, default: false },
  remarks: { type: String },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft','submitted','verified'], default: 'draft' },
}, { timestamps: true });

marksEntrySchema.index({ tenantId: 1, examId: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('MarksEntry', marksEntrySchema);
