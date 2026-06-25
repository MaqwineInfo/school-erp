const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true, trim: true },
  phone: { type: String },
  purpose: { type: String },
  toMeet: { type: String },
  toMeetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  idProofType: { type: String, enum: ['aadhaar','pan','driving_license','passport','voter_id','other'] },
  idProofNo: { type: String },
  photo: { type: String },
  gatePassNo: { type: String },
  checkIn: { type: Date, default: Date.now },
  checkOut: { type: Date },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  otpVerified: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

visitorSchema.index({ tenantId: 1, checkIn: -1 });

module.exports = mongoose.model('Visitor', visitorSchema);
