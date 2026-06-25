const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  type: { type: String, enum: ['sms', 'whatsapp', 'email'], default: 'sms' },
  templateName: { type: String },
  message: { type: String, required: true },
  recipients: [{
    phone: { type: String },
    name: { type: String },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    status: { type: String, enum: ['sent', 'delivered', 'failed', 'pending'], default: 'pending' },
    failReason: { type: String },
  }],
  totalCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  audience: { type: String, enum: ['all_parents', 'all_staff', 'class_parents', 'custom', 'individual'], default: 'individual' },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledAt: { type: Date },
  sentAt: { type: Date },
  status: { type: String, enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'], default: 'draft' },
}, { timestamps: true });

smsLogSchema.index({ tenantId: 1, createdAt: -1 });
module.exports = mongoose.model('SmsLog', smsLogSchema);
