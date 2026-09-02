const mongoose = require('mongoose');

/**
 * Transactional outbox.
 *
 * Architecture §10.1 / §13.1 / ADR-08. An event is written in the SAME transaction as the
 * state change that caused it, then dispatched by a poller after commit. That gives two
 * guarantees the naive "publish inline" approach cannot:
 *   - no event is published for a transaction that rolled back
 *   - no event is lost for a transaction that committed
 *
 * Event names and payloads follow Plan.docx Appendix C, so replacing the in-process bus
 * with Kafka later requires no change to any publisher.
 */
const outboxEventSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    name: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ['pending', 'dispatched', 'failed', 'dead'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
    availableAt: { type: Date, default: Date.now, index: true },
    dispatchedAt: { type: Date },

    /** Correlation back to the request that produced it. */
    requestId: { type: String },
    causedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

outboxEventSchema.index({ status: 1, availableAt: 1 });

module.exports = mongoose.model('OutboxEvent', outboxEventSchema);
