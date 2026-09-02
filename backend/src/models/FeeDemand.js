const mongoose = require('mongoose');

/**
 * A fee demand — one invoice raised against one student.
 *
 * Rewritten in Phase 6. The previous version is where the concession defect lived: the
 * controller wrote `demand.concession` and read `demand.paidAmount`, neither of which
 * existed on the schema, so Mongoose strict mode discarded the write and the arithmetic
 * produced NaN.
 *
 * Every monetary field below is integer PAISE (ADR-07), and every one of them is
 * DERIVED by `recalculate()` rather than assigned ad hoc — a component and its parent
 * total can never disagree again.
 */
const componentSchema = new mongoose.Schema(
  {
    feeHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead' },
    name: { type: String, required: true },
    amount: { type: Number, default: 0, min: 0 },
    concession: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 0 },
    gst: { type: Number, default: 0, min: 0 },
    paid: { type: Number, default: 0, min: 0 },
    /** Derived: amount - concession + gst - paid. */
    due: { type: Number, default: 0 },
  },
  { _id: false },
);

const feeDemandSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },

    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    enrolmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrolment' },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },

    /** Human-readable invoice number, from the atomic sequence (architecture §10.2). */
    demandNo: { type: String, index: true },

    /** "Term 1", "April 2026", "Admission". */
    period: { type: String, required: true },
    installmentName: { type: String },
    dueDate: { type: Date, index: true },

    components: { type: [componentSchema], default: [] },

    // ── Derived totals, all in paise ─────────────────────────────────────────
    grossAmount: { type: Number, default: 0 }, // sum of component amounts
    concessionAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }, // gross - concession + gst + lateFee
    totalPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 }, // totalAmount - totalPaid

    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'waived', 'void'],
      default: 'pending',
      index: true,
    },

    /** Prevents duplicate generation for the same student, structure and period. */
    generationKey: { type: String, index: true },

    voidedAt: { type: Date, default: null },
    voidReason: { type: String },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

feeDemandSchema.index({ tenantId: 1, studentId: 1, status: 1 });
feeDemandSchema.index({ tenantId: 1, dueDate: 1, status: 1 });
feeDemandSchema.index(
  { tenantId: 1, generationKey: 1 },
  { unique: true, partialFilterExpression: { generationKey: { $type: 'string' }, deletedAt: null } },
);

/**
 * Recompute every derived total from the components.
 *
 * This is the ONLY place these numbers are written. It is why applying a concession can no
 * longer discard recorded payments: `totalPaid` is summed from the components, never
 * re-derived from a field the caller happened to pass in.
 */
feeDemandSchema.methods.recalculate = function recalculate() {
  let gross = 0;
  let concession = 0;
  let gst = 0;
  let paid = 0;

  for (const c of this.components) {
    const net = Math.max(0, (c.amount || 0) - (c.concession || 0));
    c.gst = Math.round((net * (c.gstRate || 0)) / 100);
    c.due = Math.max(0, net + c.gst - (c.paid || 0));

    gross += c.amount || 0;
    concession += c.concession || 0;
    gst += c.gst;
    paid += c.paid || 0;
  }

  this.grossAmount = gross;
  this.concessionAmount = concession;
  this.gstAmount = gst;
  this.totalAmount = Math.max(0, gross - concession + gst + (this.lateFee || 0));
  this.totalPaid = paid;
  this.totalDue = Math.max(0, this.totalAmount - paid);

  if (this.status !== 'void' && this.status !== 'waived') {
    if (this.totalDue === 0) this.status = 'paid';
    else if (paid > 0) this.status = 'partial';
    else if (this.dueDate && this.dueDate < new Date()) this.status = 'overdue';
    else this.status = 'pending';
  }

  return this;
};

feeDemandSchema.pre('save', function recalc(next) {
  this.recalculate();
  next();
});

module.exports = mongoose.model('FeeDemand', feeDemandSchema);
