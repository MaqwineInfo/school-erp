const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema({
  relation: { type: String, enum: ['father','mother','guardian'], default: 'father' },
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String, lowercase: true },
  occupation: { type: String },
  qualification: { type: String },
  photo: { type: String },
}, { _id: false });

const studentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  admissionNo: { type: String, required: true },
  grNo: { type: String },
  rollNo: { type: String },
  udisePenNo: { type: String },
  apaarId: { type: String },

  // Personal info
  name: { type: String, required: true, trim: true },
  photo: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ['male','female','other'] },
  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'], default: 'unknown' },
  religion: { type: String },
  caste: { type: String },
  category: { type: String, enum: ['general','obc','sc','st','ews','rte'], default: 'general' },
  motherTongue: { type: String },
  aadhaarMasked: { type: String }, // last 4 digits

  // Address
  currentAddress: { type: String },
  permanentAddress: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String },

  // Academic
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
  divisionName: { type: String },
  stream: { type: String, enum: ['science','commerce','arts','vocational',''] },
  house: { type: String, enum: ['red','blue','green','yellow',''] },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  admissionDate: { type: Date },
  isRteStudent: { type: Boolean, default: false },

  // Family
  guardians: [guardianSchema],

  // Health
  health: {
    allergies: [{ type: String }],
    conditions: [{ type: String }],
    medications: [{ type: String }],
  },

  // Status
  status: { type: String, enum: ['active','inactive','transferred','alumni'], default: 'active' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

studentSchema.index({ tenantId: 1, admissionNo: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
studentSchema.index({ tenantId: 1, standardId: 1, divisionName: 1 });
studentSchema.index({ tenantId: 1, name: 'text' });

module.exports = mongoose.model('Student', studentSchema);
