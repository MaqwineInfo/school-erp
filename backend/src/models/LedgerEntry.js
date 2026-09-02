const mongoose = require('mongoose');

/**
 * Append-only double-entry ledger.
 *
 * Architecture §8.4. This is what makes "the daily collection report matches the gateway
 * settlement to the rupee" (Plan.docx Appendix E) an achievable acceptance criterion
 * rather than an aspiration. Corrections are reversal entries; nothing is ever mutated.
 *
 * All amounts are integer PAISE (ADR-07).
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },

    /** Groups the debit and credit legs of one economic event. */
    transactionId: { type: String, required: true, index: true },

    account: {
      type: String,
      required: true,
      enum: [
        'cash', 'bank', 'gateway_receivable',
        'fee_income', 'gst_payable', 'concession_expense',
        'student_receivable', 'advance_from_student',
        'refund_payable', 'late_fee_income', 'deposit_liability',
      ],
    },

    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },

    refType: { type: String, enum: ['FeePayment', 'FeeDemand', 'Refund', 'Adjustment', 'Reversal'] },
    refId: { type: mongoose.Schema.Types.ObjectId },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },

    narration: { type: String },
    /** Points at the entry this one reverses. */
    reversesEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerEntry', default: null },

    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ledgerEntrySchema.index({ tenantId: 1, branchId: 1, postedAt: -1 });
ledgerEntrySchema.index({ tenantId: 1, account: 1, postedAt: -1 });

// Append-only, like the audit log.
const refuse = function refuse(next) {
  next(new Error('LedgerEntry is append-only: post a reversal entry instead of editing'));
};
ledgerEntrySchema.pre('updateOne', refuse);
ledgerEntrySchema.pre('updateMany', refuse);
ledgerEntrySchema.pre('findOneAndUpdate', refuse);
ledgerEntrySchema.pre('deleteOne', refuse);
ledgerEntrySchema.pre('deleteMany', refuse);

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
