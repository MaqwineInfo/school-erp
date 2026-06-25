const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { type: String, enum: ['notes', 'question_bank', 'sample_paper', 'reference', 'video_link', 'other'], default: 'notes' },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  divisionName: { type: String },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileUrl: { type: String },
  externalUrl: { type: String },
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

studyMaterialSchema.index({ tenantId: 1, standardId: 1, subjectId: 1 });
module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
