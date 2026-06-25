const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  type: { type: String, enum: ['cl','sl','el','ml','pl','lop','comp_off','on_duty'], default: 'cl' },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  reason: { type: String },
  document: { type: String },
  status: { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
}, { timestamps: true });

leaveSchema.index({ tenantId: 1, staffId: 1, status: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
