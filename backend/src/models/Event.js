const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { type: String, enum: ['holiday', 'exam', 'event', 'meeting', 'sports', 'cultural', 'academic', 'other'], default: 'event' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  allDay: { type: Boolean, default: true },
  venue: { type: String },
  audience: { type: String, enum: ['all', 'students', 'staff', 'parents'], default: 'all' },
  standardIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Standard' }],
  color: { type: String, default: '#3b82f6' },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

eventSchema.index({ tenantId: 1, startDate: 1 });
module.exports = mongoose.model('Event', eventSchema);
