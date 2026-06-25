const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['super_admin','school_owner','principal','vice_principal','hod','class_teacher',
           'teacher','admission_officer','accountant','cashier','librarian','transport_incharge',
           'hostel_warden','hr_manager','receptionist','driver','parent','student','staff'],
    default: 'teacher',
  },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }, // custom role (overrides role string)
  permissions: [{ type: String }], // direct permission overrides
  /** For role=student — links to Student record */
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  /** For role=parent — links to one or more children */
  linkedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  isSuperAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  photo: { type: String },
  lastLoginAt: { type: Date },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ email: 1, tenantId: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
userSchema.index({ tenantId: 1, role: 1 });

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
