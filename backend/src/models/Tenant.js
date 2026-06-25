const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Identity
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  shortName: { type: String, trim: true },

  // School details
  board: { type: String, enum: ['CBSE','ICSE','IB','CAMBRIDGE','STATE_GSEB','STATE_MAHA','STATE_TN','STATE_KA','STATE_UP','OTHER'], default: 'CBSE' },
  affiliationNo: { type: String },
  udiseCode: { type: String },
  managementType: { type: String, enum: ['private','govt','aided','international'], default: 'private' },
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

  // Branding
  logo: { type: String },
  favicon: { type: String },
  primaryColor: { type: String, default: '#1a56db' },
  secondaryColor: { type: String, default: '#f59e0b' },
  customDomain: { type: String },

  // SaaS Plan
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  planName: { type: String, enum: ['trial','starter','growth','enterprise','custom'], default: 'trial' },
  status: { type: String, enum: ['onboarding','trial','active','suspended','cancelled'], default: 'onboarding' },
  trialEndsAt: { type: Date },
  subscriptionStartDate: { type: Date },
  subscriptionEndDate: { type: Date },
  studentCount: { type: Number, default: 0 }, // for billing

  // Module / Feature Flags (override plan defaults)
  enabledModules: [{ type: String }], // actual list of enabled modules for this tenant
  featureOverrides: { type: Map, of: Boolean, default: {} }, // per-feature overrides

  // Integration keys (encrypted in prod)
  integrations: {
    razorpay: { keyId: String, keySecret: String, webhookSecret: String, enabled: Boolean },
    cashfree: { appId: String, secretKey: String, enabled: Boolean },
    msg91: { authKey: String, senderId: String, enabled: Boolean },
    whatsapp: { provider: String, apiKey: String, fromNumber: String, enabled: Boolean },
    smtp: { host: String, port: Number, user: String, pass: String, from: String, enabled: Boolean },
    googleMaps: { apiKey: String, enabled: Boolean },
  },

  // Settings
  settings: {
    locale: { type: String, default: 'en-IN' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    currency: { type: String, default: 'INR' },
    academicYearStart: { type: String, enum: ['april','june'], default: 'april' },
    divisionLabel: { type: String, default: 'Division' }, // some schools call it "Section"
    standardLabel: { type: String, default: 'Class' },    // some call it "Grade"
    rankDisplayEnabled: { type: Boolean, default: true },
    attendanceSmsEnabled: { type: Boolean, default: false },
    gstEnabled: { type: Boolean, default: false },
    lateFeeEnabled: { type: Boolean, default: true },
    onlineAdmissionEnabled: { type: Boolean, default: false },
    studentPortalEnabled: { type: Boolean, default: true },
    parentPortalEnabled: { type: Boolean, default: true },
  },

  onboardingCompleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ status: 1 });
tenantSchema.index({ planName: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
