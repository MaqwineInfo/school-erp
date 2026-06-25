const mongoose = require('mongoose');

/**
 * Defines the SaaS subscription plans and which modules each plan includes.
 * Plans are global (created by Super Admin). Tenants reference a plan.
 */

const MODULE_LIST = [
  'admissions',       // Enquiry management, online admission form
  'students',         // Student information, profiles, documents
  'academics',        // Academic years, standards, subjects, timetable
  'attendance',       // Student & staff attendance
  'fees',             // Fee structures, demands, collections, GST
  'exams',            // Exams, marks entry, report cards
  'homework',         // Classwork, homework, assignments
  'study_material',   // LMS — notes, videos, recorded classes
  'communication',    // SMS, WhatsApp, notices, parent-teacher chat
  'transport',        // Routes, vehicles, GPS tracking
  'hostel',           // Rooms, allocations, mess, attendance
  'library',          // Books, issue/return, fines
  'hr',               // Staff records, leave management
  'payroll',          // Salary, payslips, Form 16
  'discipline',       // Merits, demerits, incidents
  'health',           // Medical records, vaccinations, clinic log
  'events',           // Events, calendar, photo gallery
  'inventory',        // Stock management, purchase orders
  'expense',          // Expense vouchers, petty cash
  'visitors',         // Front office, gate passes, OTP dispatch
  'certificates',     // TC, bonafide, character, custom templates
  'alumni',           // Alumni directory, donations, mentorship
  'reports',          // Standard reports, dashboards, analytics
  'website_builder',  // School website with drag-drop editor
  'multi_branch',     // Multiple branches, central dashboard
  'white_label',      // Custom domain, branding, logo
  'ai_features',      // AI-suggested remarks, weak student analysis
  'mobile_app',       // Parent/teacher/student mobile app
  'api_access',       // External API access for integrations
];

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: ['starter', 'growth', 'enterprise', 'custom'] },
  displayName: { type: String, required: true }, // "Starter", "Growth", "Enterprise"
  description: { type: String },
  pricePerStudentPerYear: { type: Number, default: 0 }, // INR
  minStudents: { type: Number, default: 0 },
  maxStudents: { type: Number, default: 250 }, // 0 = unlimited
  maxBranches: { type: Number, default: 1 },
  includedModules: [{ type: String, enum: MODULE_LIST }],
  addOnModules: [{ type: String, enum: MODULE_LIST }], // Available as paid add-ons
  features: {
    smsCredits: { type: Number, default: 0 }, // per month
    whatsappEnabled: { type: Boolean, default: false },
    gpsTrackingEnabled: { type: Boolean, default: false },
    onlineMcqEnabled: { type: Boolean, default: false },
    apiAccessEnabled: { type: Boolean, default: false },
    whiteLabelEnabled: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
    dataExportEnabled: { type: Boolean, default: true },
    backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
    supportSla: { type: String, default: '48h' },
    storageGb: { type: Number, default: 5 },
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

planSchema.statics.MODULE_LIST = MODULE_LIST;

module.exports = mongoose.model('Plan', planSchema);
