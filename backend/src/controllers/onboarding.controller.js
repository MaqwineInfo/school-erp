const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const AcademicYear = require('../models/AcademicYear');
const Standard = require('../models/Standard');
const Subject = require('../models/Subject');
const Onboarding = require('../models/Onboarding');
const Role = require('../models/Role');
const Plan = require('../models/Plan');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');
const { seedSystemRoles } = require('../utils/roleSeeder');

// Step 1: School Profile — creates tenant + starts onboarding
exports.startOnboarding = async (req, res) => {
  const { name, board, city, state, email, phone, address, pinCode, gstin, affNo, udiseCode, managementType, established } = req.body;
  if (!name || !email) throw new AppError('School name and email are required', 400);

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 50) + '-' + Date.now().toString(36);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Create tenant
    const tenant = await Tenant.create([{
      name, slug, board: board || 'CBSE', city, state, email, phone, address, pinCode,
      gstin, affiliationNo: affNo, udiseCode, managementType: managementType || 'private',
      established, status: 'onboarding', planName: 'trial',
    }], { session });

    // Create head office branch
    await Branch.create([{
      tenantId: tenant[0]._id, name, code: 'HO', address, city, state, pinCode, email, phone,
      isHeadOffice: true,
    }], { session });

    // Create onboarding tracker
    const onboarding = await Onboarding.create([{
      tenantId: tenant[0]._id,
      currentStep: 2,
      completedSteps: [1],
      steps: { schoolProfile: { name, board, city, state, email, phone, address, pinCode, gstin, affNo, udiseCode, managementType } },
    }], { session });

    await session.commitTransaction();
    sendSuccess(res, { tenantId: tenant[0]._id, slug: tenant[0].slug, onboardingId: onboarding[0]._id }, 'School profile saved. Proceed to step 2.', 201);
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// Step 2: Plan & Module Selection
exports.selectPlan = async (req, res) => {
  const { tenantId, planId, enabledModules, addOns } = req.body;
  const plan = await Plan.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);

  const allModules = [...new Set([...plan.includedModules, ...(addOns || [])])];
  const final = enabledModules ? enabledModules.filter(m => allModules.includes(m)) : allModules;

  await Tenant.findByIdAndUpdate(tenantId, { $set: { planId, planName: plan.name, enabledModules: final } });
  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: { currentStep: 3, 'steps.planSelection': { planId, enabledModules: final, addOns } },
    $addToSet: { completedSteps: 2 },
  });
  sendSuccess(res, { enabledModules: final }, 'Plan selected');
};

// Step 3: Academic Setup
exports.academicSetup = async (req, res) => {
  const { tenantId, academicYearName, startDate, endDate, terms, standards, workingDays } = req.body;
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  const branch = await Branch.findOne({ tenantId, isHeadOffice: true });

  // Create academic year
  const academicYear = await AcademicYear.create({
    tenantId, branchId: branch?._id, name: academicYearName,
    startDate: new Date(startDate), endDate: new Date(endDate),
    terms: terms || [], isActive: true,
  });

  // Create standards + divisions
  const standardDocs = await Standard.insertMany(
    (standards || []).map((s, i) => ({
      tenantId, branchId: branch?._id,
      name: s.name, shortName: s.shortName || s.name, order: i,
      stage: s.stage || 'primary',
      divisions: (s.divisions || ['A']).map(d => ({ name: d, strength: 0 })),
    }))
  );

  await Tenant.findByIdAndUpdate(tenantId, { $set: { 'settings.academicYearStart': req.body.startMonth || 'april' } });
  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: { currentStep: 4, 'steps.academicSetup': { academicYearName, startMonth: req.body.startMonth, terms, standards, workingDays } },
    $addToSet: { completedSteps: 3 },
  });

  sendSuccess(res, { academicYearId: academicYear._id, standards: standardDocs.length }, 'Academic structure created');
};

// Step 4: Create Admin User
exports.createAdminUser = async (req, res) => {
  const { tenantId, name, email, phone, password, designation } = req.body;
  if (!name || !email || !password) throw new AppError('Name, email and password required', 400);

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);

  const exists = await User.findOne({ email: email.toLowerCase(), tenantId, deletedAt: null });
  if (exists) throw new AppError('Email already registered', 409);

  // Seed system roles for this tenant if not already done
  await seedSystemRoles(tenantId);

  // Find principal role
  const principalRole = await Role.findOne({ tenantId, slug: 'principal' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    tenantId, name, email: email.toLowerCase(), passwordHash, phone,
    role: 'principal', roleId: principalRole?._id, isActive: true,
  });

  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: user._id, tenantId: user.tenantId, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: { currentStep: 5, 'steps.adminUser': { name, email, phone, designation } },
    $addToSet: { completedSteps: 4 },
  });

  sendSuccess(res, { userId: user._id, token }, 'Admin user created');
};

// Step 5: Fee Setup
exports.feeSetup = async (req, res) => {
  const { tenantId, gstEnabled, lateFeeEnabled, paymentModes } = req.body;
  await Tenant.findByIdAndUpdate(tenantId, {
    $set: { 'settings.gstEnabled': gstEnabled, 'settings.lateFeeEnabled': lateFeeEnabled },
  });
  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: { currentStep: 6, 'steps.feeSetup': { gstEnabled, lateFeeEnabled, paymentModes } },
    $addToSet: { completedSteps: 5 },
  });
  sendSuccess(res, null, 'Fee settings saved');
};

// Step 6: Import Students (bulk from Excel — accepts parsed JSON)
exports.importStudents = async (req, res) => {
  const { tenantId, students } = req.body;
  if (!Array.isArray(students)) throw new AppError('students array required', 400);

  const Student = require('../models/Student');
  const branch = await Branch.findOne({ tenantId, isHeadOffice: true });

  let imported = 0, skipped = 0;
  const errors = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    if (!s.name || !s.admissionNo) { errors.push({ row: i + 2, message: 'Name and admissionNo required' }); skipped++; continue; }
    try {
      await Student.create({ ...s, tenantId, branchId: branch?._id });
      imported++;
    } catch (err) {
      errors.push({ row: i + 2, message: err.message });
      skipped++;
    }
  }

  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: { currentStep: 7, 'steps.importStudents': { totalImported: imported, skipped, errors } },
    $addToSet: { completedSteps: 6 },
  });

  sendSuccess(res, { imported, skipped, errors }, `Imported ${imported} students`);
};

// Step 7: Payment Gateway Config
exports.paymentGatewaySetup = async (req, res) => {
  const { tenantId, gateway, keyId, keySecret } = req.body;
  const update = { [`integrations.${gateway}.enabled`]: true };
  if (keyId) update[`integrations.${gateway}.keyId`] = keyId;
  if (keySecret) update[`integrations.${gateway}.keySecret`] = keySecret;

  await Tenant.findByIdAndUpdate(tenantId, { $set: update });
  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: { currentStep: 8, 'steps.paymentGateway': { gateway, isConfigured: !!(keyId && keySecret) } },
    $addToSet: { completedSteps: 7 },
  });
  sendSuccess(res, null, 'Payment gateway configured');
};

// Step 8: SMS / WhatsApp Config  + complete onboarding
exports.smsSetup = async (req, res) => {
  const { tenantId, smsProvider, whatsappProvider, smsKey, whatsappKey, senderId, fromNumber } = req.body;

  const update = {};
  if (smsProvider && smsProvider !== 'none') {
    update['integrations.msg91.enabled'] = true;
    if (smsKey) update['integrations.msg91.authKey'] = smsKey;
    if (senderId) update['integrations.msg91.senderId'] = senderId;
  }
  if (whatsappProvider && whatsappProvider !== 'none') {
    update['integrations.whatsapp.provider'] = whatsappProvider;
    update['integrations.whatsapp.enabled'] = true;
    if (whatsappKey) update['integrations.whatsapp.apiKey'] = whatsappKey;
    if (fromNumber) update['integrations.whatsapp.fromNumber'] = fromNumber;
  }

  await Tenant.findByIdAndUpdate(tenantId, { $set: { ...update, onboardingCompleted: true, status: 'trial' } });
  await Onboarding.findOneAndUpdate({ tenantId }, {
    $set: {
      currentStep: 8,
      isCompleted: true,
      completedAt: new Date(),
      'steps.smsWhatsapp': { smsProvider, whatsappProvider, isConfigured: true },
    },
    $addToSet: { completedSteps: 8 },
  });
  sendSuccess(res, null, 'Setup complete! Welcome to School ERP.');
};

// Get onboarding status
exports.getStatus = async (req, res) => {
  const onboarding = await Onboarding.findOne({ tenantId: req.params.tenantId }).populate('steps.planSelection.planId', 'displayName includedModules');
  if (!onboarding) throw new AppError('Onboarding not found', 404);
  sendSuccess(res, onboarding);
};
