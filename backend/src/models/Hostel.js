const mongoose = require('mongoose');

const hostelRoomSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  block: { type: String }, // Boys Block, Girls Block
  floor: { type: String },
  roomNo: { type: String, required: true },
  type: { type: String, enum: ['single','double','triple','dorm'], default: 'double' },
  capacity: { type: Number, default: 2 },
  occupancy: { type: Number, default: 0 },
  gender: { type: String, enum: ['boys','girls'], default: 'boys' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

hostelRoomSchema.index({ tenantId: 1, block: 1, roomNo: 1 });

const hostelAllocationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom', required: true },
  bedNo: { type: String },
  from: { type: Date },
  to: { type: Date },
  status: { type: String, enum: ['active','vacated','waiting'], default: 'active' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
}, { timestamps: true });

hostelAllocationSchema.index({ tenantId: 1, studentId: 1, status: 1 });

const HostelRoom = mongoose.model('HostelRoom', hostelRoomSchema);
const HostelAllocation = mongoose.model('HostelAllocation', hostelAllocationSchema);

module.exports = { HostelRoom, HostelAllocation };
