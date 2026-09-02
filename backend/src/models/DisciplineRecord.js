const mongoose = require('mongoose');

const disciplineSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['merit', 'demerit', 'incident'], default: 'incident' },
  points: { type: Number, default: 0 },
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('DisciplineRecord', disciplineSchema);
