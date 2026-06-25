const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['bonafide','character','conduct','tc','migration','study','participation','merit','achievement'], required: true },
  serialNo: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String },
  fileUrl: { type: String },
  verificationCode: { type: String },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

certificateSchema.index({ tenantId: 1, type: 1, serialNo: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
certificateSchema.index({ verificationCode: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
