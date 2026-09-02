const mongoose = require('mongoose');
const { PLAN_MODULE_LIST } = require('../constants/modules');

/**
 * A tenant — one school, coaching centre, or trust running several branches.
 *
 * Added in Phase 1:
 *  - `institutionType` (ADR-03 / D8): school | coaching | both. Drives whether the academic
 *    core presents as Class+Section or as Course+Batch, and which modules are offered.
 *  - `rbacVersion`: bumped on any role change to invalidate the permission cache instantly
 *    (architecture §7.4) rather than waiting out a TTL.
 *  - `approvalThresholds`: RBAC Appendix B escalation limits, per tenant, in paise.
 *  - integration credentials are encrypted at rest via platform/crypto/secrets.
 */
const tenantSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    shortName: { type: String, trim: true },

    /** What kind of institution this is — decides the academic vocabulary. */
    institutionType: {
      type: String,
      enum: ['school', 'coaching', 'both'],
      default: 'school',
    },

    // School details
    board: {
      type: String,
      enum: ['CBSE', 'ICSE', 'IB', 'CAMBRIDGE', 'STATE_GSEB', 'STATE_MAHA', 'STATE_TN', 'STATE_KA', 'STATE_UP', 'STATE_WB', 'OTHER'],
      default: 'CBSE',
    },
    affiliationNo: { type: String },
    udiseCode: { type: String },
    managementType: { type: String, enum: ['private', 'govt', 'aided', 'international'], default: 'private' },
    established: { type: Number },

    // Contact
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pinCode: { type: String },
    phone: { type: String },
    email: { type: String, lowercase: true },
    website: { type: String },
    gstin: { type: String },
    pan: { type: String },

    // Branding
    logo: { type: String },
    favicon: { type: String },
    primaryColor: { type: String, default: '#1a56db' },
    secondaryColor: { type: String, default: '#f59e0b' },
    customDomain: { type: String },

    // SaaS plan
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planName: { type: String, enum: ['trial', 'starter', 'growth', 'enterprise', 'custom'], default: 'trial' },
    status: { type: String, enum: ['onboarding', 'trial', 'active', 'suspended', 'cancelled'], default: 'onboarding' },
    trialEndsAt: { type: Date },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    studentCount: { type: Number, default: 0 },

    enabledModules: [{ type: String, enum: PLAN_MODULE_LIST }],
    featureOverrides: { type: Map, of: Boolean, default: () => new Map() },

    /**
     * Integration credentials. Secret fields are AES-256-GCM encrypted at rest and are
     * never returned by any API — see platform/crypto/secrets.js.
     */
    integrations: {
      razorpay: { provider: { type: String, default: 'razorpay' }, keyId: String, keySecret: String, webhookSecret: String, enabled: Boolean },
      cashfree: { appId: String, secretKey: String, enabled: Boolean },
      msg91: { provider: { type: String, default: 'msg91' }, authKey: String, senderId: String, enabled: Boolean },
      whatsapp: { provider: { type: String, default: 'cloud_api' }, apiKey: String, fromNumber: String, verifyToken: String, enabled: Boolean },
      smtp: { provider: { type: String, default: 'smtp' }, host: String, port: Number, user: String, pass: String, from: String, enabled: Boolean },
      fcm: { provider: { type: String, default: 'fcm' }, serverKey: String, enabled: Boolean },
      googleMaps: { apiKey: String, enabled: Boolean },
    },

    settings: {
      locale: { type: String, default: 'en-IN' },
      languages: { type: [String], default: ['en'] },
      timezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      currency: { type: String, default: 'INR' },
      academicYearStart: { type: String, enum: ['april', 'june'], default: 'april' },

      /** Display labels — schools say Section, some say Division; coaching says Batch. */
      labels: {
        standard: { type: String, default: 'Class' },
        division: { type: String, default: 'Section' },
        course: { type: String, default: 'Course' },
        batch: { type: String, default: 'Batch' },
      },

      rankDisplayEnabled: { type: Boolean, default: true },
      attendanceSmsEnabled: { type: Boolean, default: false },
      gstEnabled: { type: Boolean, default: false },
      lateFeeEnabled: { type: Boolean, default: true },
      onlineAdmissionEnabled: { type: Boolean, default: false },
      studentPortalEnabled: { type: Boolean, default: true },
      parentPortalEnabled: { type: Boolean, default: true },
      quietHours: {
        enabled: { type: Boolean, default: true },
        from: { type: String, default: '21:00' },
        to: { type: String, default: '07:00' },
      },
    },

    /**
     * Approval escalation limits, in PAISE (ADR-07). Defaults from RBAC Appendix B.
     * Every tenant may reconfigure these in Settings → Approval Thresholds.
     */
    approvalThresholds: {
      feeWaiverPercentL1: { type: Number, default: 20 },
      feeWaiverPercentL2: { type: Number, default: 40 },
      expenseL1: { type: Number, default: 2500000 }, // ₹25,000
      expenseL2: { type: Number, default: 10000000 }, // ₹1,00,000
      pettyCashLimit: { type: Number, default: 500000 }, // ₹5,000
      inventoryPoL1: { type: Number, default: 1000000 }, // ₹10,000
      inventoryPoL2: { type: Number, default: 5000000 }, // ₹50,000
      salaryIncrementPercentL1: { type: Number, default: 10 },
      salaryIncrementPercentL2: { type: Number, default: 20 },
    },

    /** Bumped on any role/permission write to invalidate the RBAC cache immediately. */
    rbacVersion: { type: Number, default: 0 },

    onboardingCompleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ status: 1 });
tenantSchema.index({ planName: 1 });

/** Does this tenant use class/section academics? */
tenantSchema.methods.usesSchoolAcademics = function usesSchoolAcademics() {
  return this.institutionType === 'school' || this.institutionType === 'both';
};

/** Does this tenant use course/batch academics? */
tenantSchema.methods.usesCoachingAcademics = function usesCoachingAcademics() {
  return this.institutionType === 'coaching' || this.institutionType === 'both';
};

module.exports = mongoose.model('Tenant', tenantSchema);
