const mongoose = require('mongoose');

/**
 * A dispatched (or queued) message.
 *
 * Architecture §12.3: every send is recorded with the provider id, cost and delivery
 * status, which is what makes per-tenant SMS credit accounting a query rather than a
 * guess — and gives the delivery-report screen (WF-0203) something to read.
 */
const notificationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    /** The domain event that triggered it, or 'manual'. */
    eventCode: { type: String, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'NotificationTemplate' },

    channel: { type: String, enum: ['sms', 'whatsapp', 'email', 'push', 'in_app'], required: true },

    /** Recipient — a user, a guardian phone, or both. */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    to: { type: String, required: true },
    recipientName: { type: String },

    subject: { type: String },
    body: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ['queued', 'suppressed', 'sent', 'delivered', 'failed', 'read'],
      default: 'queued',
      index: true,
    },
    /** Why a message was not sent: quiet hours, throttle, opt-out, no template. */
    suppressionReason: { type: String },

    provider: { type: String },
    providerMessageId: { type: String },
    error: { type: String },
    /** Cost in paise, for credit accounting. */
    cost: { type: Number, default: 0 },

    attempts: { type: Number, default: 0 },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, to: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, status: 1, channel: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
