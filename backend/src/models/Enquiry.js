const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  studentName: { type: String, required: true, trim: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male','female','other'] },
  parentName: { type: String },
  parentPhone: { type: String, required: true },
  parentEmail: { type: String, lowercase: true },
  currentSchool: { type: String },
  applyingForStandard: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
  applyingForDivision: { type: String, trim: true },
  applyingForYear: { type: String },
  source: {
    type: String,
    enum: ['walk_in','reference','newspaper','website','hoarding','justdial','facebook','instagram','google_ad','other'],
    default: 'walk_in',
  },
  status: {
    type: String,
    enum: ['new','contacted','school_visit','form_issued','form_submitted','admitted','lost'],
    default: 'new',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  followUpDate: { type: Date },
  notes: { type: String },
  convertedToStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

enquirySchema.index({ tenantId: 1, status: 1 });
enquirySchema.index({ tenantId: 1, parentPhone: 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
