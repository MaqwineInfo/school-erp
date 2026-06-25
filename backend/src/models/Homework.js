const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', required: true },
  divisionName: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['classwork','homework','assignment','project'], default: 'homework' },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  attachments: [{ name: String, url: String }],
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

homeworkSchema.index({ tenantId: 1, standardId: 1, divisionName: 1, dueDate: -1 });

module.exports = mongoose.model('Homework', homeworkSchema);
