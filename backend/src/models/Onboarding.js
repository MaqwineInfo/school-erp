const mongoose = require('mongoose');

/**
 * Tracks the onboarding progress for a new school.
 * Preserved so that an interrupted onboarding can be resumed.
 */
const onboardingSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  currentStep: { type: Number, default: 1, min: 1, max: 8 },
  completedSteps: [{ type: Number }],
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },

  // Step data snapshots
  steps: {
    schoolProfile: {
      name: String,
      logo: String,
      board: String,
      affNo: String,
      udiseCode: String,
      gstin: String,
      address: String,
      city: String,
      state: String,
      pinCode: String,
      phone: String,
      email: String,
      website: String,
      established: Number,
      managementType: { type: String, enum: ['private', 'govt', 'aided', 'international'] },
    },
    planSelection: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
      enabledModules: [{ type: String }],
      addOns: [{ type: String }],
    },
    academicSetup: {
      academicYearName: String,
      startMonth: { type: String, enum: ['april', 'june'] },
      terms: [{ name: String, startMonth: Number, endMonth: Number }],
      standards: [{ name: String, divisions: [String] }],
      workingDays: [{ type: String, enum: ['mon','tue','wed','thu','fri','sat','sun'] }],
    },
    adminUser: {
      name: String,
      email: String,
      phone: String,
      designation: String,
    },
    feeSetup: {
      currency: { type: String, default: 'INR' },
      gstEnabled: { type: Boolean, default: false },
      lateFeeEnabled: { type: Boolean, default: true },
      paymentModes: [{ type: String }],
    },
    importStudents: {
      totalImported: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      errors: [{ row: Number, message: String }],
    },
    paymentGateway: {
      gateway: { type: String, enum: ['razorpay', 'cashfree', 'payu', 'none'], default: 'none' },
      isConfigured: { type: Boolean, default: false },
    },
    smsWhatsapp: {
      smsProvider: { type: String, enum: ['msg91', 'twilio', 'textlocal', 'none'], default: 'none' },
      whatsappProvider: { type: String, enum: ['wati', 'interakt', '360dialog', 'none'], default: 'none' },
      isConfigured: { type: Boolean, default: false },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Onboarding', onboardingSchema);
