const mongoose = require('mongoose');

/**
 * Idempotency-Key → stored response.
 *
 * Architecture §10.3. Required on payment collection, admission enrolment, payroll release
 * and every gateway webhook — `docs/workflows/fee-collection-flow.md` specified this from
 * the start and no code implemented it.
 */
const idempotencyRecordSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    key: { type: String, required: true },
    /** Guards against a key being reused for a different operation. */
    endpoint: { type: String, required: true },
    requestHash: { type: String, required: true },

    status: { type: String, enum: ['in_progress', 'completed', 'failed'], default: 'in_progress' },
    statusCode: { type: Number },
    responseBody: { type: mongoose.Schema.Types.Mixed },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

idempotencyRecordSchema.index({ tenantId: 1, key: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
