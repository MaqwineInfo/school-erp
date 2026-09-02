const mongoose = require('mongoose');

/**
 * Atomic counters for receipt numbers, TC serials, voucher numbers, admission numbers.
 *
 * Architecture §10.2. This exists because the previous receipt numbering did
 * read-max-then-increment-in-JavaScript with no unique index and no transaction, so two
 * cashiers collecting simultaneously produced the same `RCP000123`.
 *
 * `findOneAndUpdate` with `$inc` is atomic at the document level, which is exactly the
 * guarantee needed.
 */
const sequenceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    /** receipt | tc | voucher | admission | indent | po | certificate */
    kind: { type: String, required: true },
    /** Financial or academic year the counter belongs to, e.g. "2026-27". */
    period: { type: String, default: '' },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true },
);

sequenceSchema.index({ tenantId: 1, branchId: 1, kind: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Sequence', sequenceSchema);
