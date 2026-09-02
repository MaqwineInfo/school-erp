const mongoose = require('mongoose');

/**
 * A payment received against one or more demands.
 *
 * `receiptNo` comes from the atomic sequence (architecture §10.2) and carries a unique
 * index, so the read-max-then-increment race that produced duplicate `RCP000123` under
 * concurrent collection cannot recur even if a future bug reintroduces it.
 *
 * Amounts are integer PAISE (ADR-07).
 */
const allocationSchema = new mongoose.Schema(
  {
    demandId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeDemand', required: true },
    componentName: { type: String },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const feePaymentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },

    receiptNo: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },

    amount: { type: Number, required: true, min: 1 },
    /** How the amount was spread across demands and components. */
    allocations: { type: [allocationSchema], default: [] },

    method: {
      type: String,
      enum: ['cash', 'cheque', 'dd', 'neft', 'rtgs', 'upi', 'card', 'netbanking', 'wallet', 'adjustment'],
      required: true,
    },

    // Offline instruments
    chequeNo: { type: String },
    chequeDate: { type: Date },
    bankName: { type: String },
    isBounced: { type: Boolean, default: false },
    bouncedAt: { type: Date },
    bounceCharge: { type: Number, default: 0 },

    // Online gateway
    gateway: { type: String, enum: ['razorpay', 'cashfree', 'payu', 'noop', null], default: null },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    gatewaySignature: { type: String, select: false },
    gatewayFee: { type: Number, default: 0 },

    /** Client-supplied key that makes retries safe (architecture §10.3). */
    idempotencyKey: { type: String },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'reversed', 'refunded'],
      default: 'success',
      index: true,
    },

    reversedAt: { type: Date },
    reversalReason: { type: String },
    refundedAmount: { type: Number, default: 0 },

    remarks: { type: String },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date, default: Date.now, index: true },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** The safety net behind the atomic sequence — a duplicate can never be persisted. */
feePaymentSchema.index(
  { tenantId: 1, branchId: 1, receiptNo: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
feePaymentSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
feePaymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } },
);
feePaymentSchema.index({ tenantId: 1, paidAt: -1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
