const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  name: { type: String, required: true, trim: true },
  batch: { type: String },
  lastClass: { type: String },
  phone: { type: String },
  email: { type: String, lowercase: true },
  occupation: { type: String },
  city: { type: String },
  notes: { type: String },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Alumni', alumniSchema);
