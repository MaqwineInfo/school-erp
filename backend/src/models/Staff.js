const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  photo: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ['male','female','other'] },
  designation: { type: String },
  department: { type: String },
  qualification: [{ degree: String, institution: String, year: Number, percentage: Number }],
  experience: [{ school: String, from: Date, to: Date, role: String }],
  joiningDate: { type: Date },
  phone: { type: String },
  email: { type: String, lowercase: true },
  aadhaarMasked: { type: String },
  pan: { type: String },
  uan: { type: String },
  bankAccount: { number: String, ifsc: String, bankName: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

staffSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
staffSchema.index({ tenantId: 1, name: 'text' });

module.exports = mongoose.model('Staff', staffSchema);
