const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  no: { type: Number },
  title: { type: String, required: true },
  topics: [{ type: String }],
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  completedDate: { type: Date },
  remarks: { type: String },
}, { _id: false });

const syllabusSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chapters: [chapterSchema],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

syllabusSchema.index({ tenantId: 1, academicYearId: 1, standardId: 1, subjectId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
module.exports = mongoose.model('Syllabus', syllabusSchema);
