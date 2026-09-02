const mongoose = require('mongoose');

/**
 * Student — the core record.
 *
 * Phase 4 / architecture §8.3. The previous schema was 74 lines against a specification
 * (§5) describing roughly 80 fields. Expanded here, and structured rather than flat:
 * health, documents and timeline live in their own collections because they grow unbounded
 * AND carry different access rules — the School Nurse gets the health profile without the
 * fee ledger, and the Counsellor's notes stay invisible to the Class Teacher.
 *
 * Aadhaar (ADR-13 / DPDP): the full number is NEVER stored. Only a keyed blind index (for
 * duplicate detection) and the last four digits (for masked display) are persisted.
 */

const guardianSchema = new mongoose.Schema(
  {
    relation: { type: String, enum: ['father', 'mother', 'guardian'], default: 'father' },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    occupation: { type: String },
    qualification: { type: String },
    /** Annual income in PAISE — drives RTE/EWS eligibility (ADR-07). */
    annualIncome: { type: Number },
    photo: { type: String },
    isPrimary: { type: Boolean, default: false },
    /** Links to the parent's login, so a portal user resolves to their children. */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['current', 'permanent'], default: 'current' },
    line1: { type: String },
    line2: { type: String },
    village: { type: String },
    taluka: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pinCode: { type: String },
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

    // ── Identification ────────────────────────────────────────────────────────
    admissionNo: { type: String, required: true, trim: true },
    grNo: { type: String, trim: true }, // General Register number
    rollNo: { type: String, trim: true },
    udisePenNo: { type: String, trim: true }, // Permanent Education Number
    apaarId: { type: String, trim: true }, // lifelong academic account

    // ── Personal ──────────────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    photo: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown',
    },
    religion: { type: String },
    caste: { type: String },
    category: { type: String, enum: ['general', 'obc', 'sc', 'st', 'ews', 'rte'], default: 'general' },
    motherTongue: { type: String },
    nationality: { type: String, default: 'Indian' },

    /**
     * Aadhaar — DPDP / UIDAI (ADR-13). No field for the raw number exists, deliberately.
     * `aadhaarHash` is a keyed blind index for duplicate detection; `aadhaarLast4` is for
     * masked display (XXXX-XXXX-1234). Unmasking is a Compliance-Officer-only,
     * step-up-MFA, per-view-audited operation that reads from neither.
     */
    aadhaarHash: { type: String, select: false, index: true },
    aadhaarLast4: { type: String, maxlength: 4 },

    // ── Address ───────────────────────────────────────────────────────────────
    addresses: { type: [addressSchema], default: [] },

    // ── Academic (denormalised; Enrolment is authoritative) ──────────────────
    academicGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup', index: true },
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    divisionName: { type: String },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    stream: { type: String, enum: ['science', 'commerce', 'arts', 'vocational', ''], default: '' },
    house: { type: String },
    admissionDate: { type: Date },
    previousSchool: {
      name: { type: String },
      board: { type: String },
      lastClass: { type: String },
      tcNumber: { type: String },
    },

    // ── Family ────────────────────────────────────────────────────────────────
    guardians: { type: [guardianSchema], default: [] },
    siblingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    // ── Services ──────────────────────────────────────────────────────────────
    isRteStudent: { type: Boolean, default: false },
    transport: {
      isAvailing: { type: Boolean, default: false },
      routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transport' },
      stopId: { type: mongoose.Schema.Types.ObjectId },
    },
    hostel: {
      isResident: { type: Boolean, default: false },
      roomId: { type: mongoose.Schema.Types.ObjectId },
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['enquiry', 'admitted', 'active', 'inactive', 'transferred', 'withdrawn', 'alumni'],
      default: 'active',
      index: true,
    },

    /** DPDP Act 2023 — parental consent for processing a child's data. */
    consent: {
      acceptedAt: { type: Date },
      acceptedBy: { type: String }, // guardian name
      version: { type: String },
      purposes: [{ type: String }],
      withdrawnAt: { type: Date, default: null },
    },

    /** Set when a DPDP erasure request starts the 30-day hold. */
    erasureRequestedAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

studentSchema.index(
  { tenantId: 1, admissionNo: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
studentSchema.index({ tenantId: 1, academicGroupId: 1, status: 1 });
studentSchema.index({ tenantId: 1, standardId: 1, divisionName: 1 });
studentSchema.index({ tenantId: 1, name: 'text', admissionNo: 'text' });
studentSchema.index({ tenantId: 1, 'guardians.phone': 1 });

studentSchema.pre('save', function normalise(next) {
  if (this.divisionName) this.divisionName = String(this.divisionName).trim().toUpperCase();
  next();
});

/** Masked Aadhaar for display — never returns the full number. */
studentSchema.methods.maskedAadhaar = function maskedAadhaar() {
  return this.aadhaarLast4 ? `XXXX-XXXX-${this.aadhaarLast4}` : null;
};

studentSchema.methods.primaryGuardian = function primaryGuardian() {
  return this.guardians?.find((g) => g.isPrimary) ?? this.guardians?.[0] ?? null;
};

module.exports = mongoose.model('Student', studentSchema);
