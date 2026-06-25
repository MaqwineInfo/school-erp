const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['checkup', 'vaccination', 'incident', 'chronic', 'dental', 'eye'], default: 'checkup' },
  date: { type: Date, default: Date.now },
  height: { type: Number },
  weight: { type: Number },
  bmi: { type: Number },
  visionLeft: { type: String },
  visionRight: { type: String },
  bloodPressure: { type: String },
  temperature: { type: Number },
  diagnosis: { type: String },
  treatment: { type: String },
  medicines: [{ name: String, dosage: String, duration: String }],
  doctorName: { type: String },
  nextCheckupDate: { type: Date },
  notes: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

healthRecordSchema.index({ tenantId: 1, studentId: 1, date: -1 });
module.exports = mongoose.model('HealthRecord', healthRecordSchema);
