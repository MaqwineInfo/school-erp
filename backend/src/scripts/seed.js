/**
 * Seed script — creates a super admin user + demo school tenant
 * Run: node src/scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

async function seed() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const Tenant = require('../models/Tenant');
  const User = require('../models/User');

  // 1. Create tenant (demo school)
  let tenant = await Tenant.findOne({ slug: 'demo-school' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Sunrise Public School',
      slug: 'demo-school',
      board: 'CBSE',
      plan: 'enterprise',
      status: 'active',
      city: 'Mumbai',
      state: 'Maharashtra',
      email: 'admin@sunrise.edu.in',
      phone: '9876543210',
    });
    console.log('✅ Created tenant: Sunrise Public School (slug: demo-school)');
  } else {
    console.log('ℹ️  Tenant already exists:', tenant.name);
  }

  // 2. Create super admin
  const existingAdmin = await User.findOne({ email: 'admin@school.in' });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    await User.create({
      name: 'Super Admin',
      email: 'admin@school.in',
      passwordHash,
      role: 'super_admin',
      isSuperAdmin: true,
      isActive: true,
    });
    console.log('✅ Created super admin: admin@school.in / admin123');
  } else {
    console.log('ℹ️  Super admin already exists');
  }

  // 3. Create school principal user
  const existingPrincipal = await User.findOne({ email: 'principal@sunrise.edu.in' });
  if (!existingPrincipal) {
    const passwordHash = await bcrypt.hash('school123', 12);
    await User.create({
      name: 'Mr. Vikram Reddy',
      email: 'principal@sunrise.edu.in',
      passwordHash,
      role: 'principal',
      tenantId: tenant._id,
      isActive: true,
    });
    console.log('✅ Created principal: principal@sunrise.edu.in / school123');
  } else {
    console.log('ℹ️  Principal already exists');
  }

  // 4. Create demo academic year
  const AcademicYear = require('../models/AcademicYear');
  const existing = await AcademicYear.findOne({ tenantId: tenant._id, name: '2026-27' });
  if (!existing) {
    await AcademicYear.create({
      tenantId: tenant._id,
      name: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      terms: [
        { name: 'Term 1', startDate: new Date('2026-04-01'), endDate: new Date('2026-09-30') },
        { name: 'Term 2', startDate: new Date('2026-10-01'), endDate: new Date('2027-03-31') },
      ],
      holidays: [
        { name: 'Independence Day', date: new Date('2026-08-15'), type: 'national' },
        { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), type: 'national' },
        { name: 'Diwali', date: new Date('2026-11-08'), type: 'religious' },
      ],
    });
    console.log('✅ Created academic year 2026-27');
  }

  // 5. Create demo standards
  const Standard = require('../models/Standard');
  const stdCount = await Standard.countDocuments({ tenantId: tenant._id });
  if (stdCount === 0) {
    const standardsData = [
      { name: 'Nursery', shortName: 'NUR', order: 0, stage: 'pre_primary', divisions: [{ name: 'A', strength: 25 }] },
      { name: 'LKG', shortName: 'LKG', order: 1, stage: 'pre_primary', divisions: [{ name: 'A', strength: 30 }, { name: 'B', strength: 28 }] },
      { name: 'UKG', shortName: 'UKG', order: 2, stage: 'pre_primary', divisions: [{ name: 'A', strength: 32 }] },
      { name: 'Class 1', shortName: '1', order: 3, stage: 'primary', divisions: [{ name: 'A', strength: 40 }, { name: 'B', strength: 38 }] },
      { name: 'Class 2', shortName: '2', order: 4, stage: 'primary', divisions: [{ name: 'A', strength: 40 }, { name: 'B', strength: 42 }] },
      { name: 'Class 3', shortName: '3', order: 5, stage: 'primary', divisions: [{ name: 'A', strength: 38 }, { name: 'B', strength: 40 }] },
      { name: 'Class 4', shortName: '4', order: 6, stage: 'primary', divisions: [{ name: 'A', strength: 45 }, { name: 'B', strength: 43 }] },
      { name: 'Class 5', shortName: '5', order: 7, stage: 'primary', divisions: [{ name: 'A', strength: 45 }] },
      { name: 'Class 6', shortName: '6', order: 8, stage: 'middle', divisions: [{ name: 'A', strength: 40 }, { name: 'B', strength: 38 }] },
      { name: 'Class 7', shortName: '7', order: 9, stage: 'middle', divisions: [{ name: 'A', strength: 42 }] },
      { name: 'Class 8', shortName: '8', order: 10, stage: 'middle', divisions: [{ name: 'A', strength: 38 }, { name: 'B', strength: 40 }] },
      { name: 'Class 9', shortName: '9', order: 11, stage: 'secondary', divisions: [{ name: 'A', strength: 45 }, { name: 'B', strength: 44 }] },
      { name: 'Class 10', shortName: '10', order: 12, stage: 'secondary', divisions: [{ name: 'A', strength: 46 }, { name: 'B', strength: 44 }] },
      { name: 'Class 11', shortName: '11', order: 13, stage: 'senior_secondary', streams: ['science','commerce','arts'], divisions: [{ name: 'Sci', strength: 40 }, { name: 'Com', strength: 35 }, { name: 'Arts', strength: 28 }] },
      { name: 'Class 12', shortName: '12', order: 14, stage: 'senior_secondary', streams: ['science','commerce','arts'], divisions: [{ name: 'Sci', strength: 38 }, { name: 'Com', strength: 32 }, { name: 'Arts', strength: 25 }] },
    ];
    await Standard.insertMany(standardsData.map(s => ({ ...s, tenantId: tenant._id })));
    console.log('✅ Created 15 standards (Nursery to Class 12)');
  }

  // 6. Create demo subjects
  const Subject = require('../models/Subject');
  const subCount = await Subject.countDocuments({ tenantId: tenant._id });
  if (subCount === 0) {
    await Subject.insertMany([
      { tenantId: tenant._id, name: 'Mathematics', code: 'MATH-041', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 6 },
      { tenantId: tenant._id, name: 'English', code: 'ENG-184', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 5 },
      { tenantId: tenant._id, name: 'Hindi', code: 'HIN-002', type: 'language', maxMarks: 100, passMarks: 33, periodsPerWeek: 5 },
      { tenantId: tenant._id, name: 'Science', code: 'SCI-086', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 5 },
      { tenantId: tenant._id, name: 'Social Science', code: 'SST-087', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 4 },
      { tenantId: tenant._id, name: 'Computer Science', code: 'CS-083', type: 'elective', maxMarks: 100, passMarks: 33, periodsPerWeek: 3 },
      { tenantId: tenant._id, name: 'Physical Education', code: 'PE-048', type: 'co_scholastic', maxMarks: 100, passMarks: 33, periodsPerWeek: 2 },
      { tenantId: tenant._id, name: 'Sanskrit', code: 'SKT-122', type: 'language', maxMarks: 100, passMarks: 33, periodsPerWeek: 3 },
      { tenantId: tenant._id, name: 'Physics', code: 'PHY-042', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 6 },
      { tenantId: tenant._id, name: 'Chemistry', code: 'CHE-043', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 6 },
      { tenantId: tenant._id, name: 'Biology', code: 'BIO-044', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 6 },
      { tenantId: tenant._id, name: 'Accountancy', code: 'ACC-055', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 5 },
      { tenantId: tenant._id, name: 'Economics', code: 'ECO-030', type: 'core', maxMarks: 100, passMarks: 33, periodsPerWeek: 5 },
    ]);
    console.log('✅ Created 13 subjects');
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials:');
  console.log('  Super Admin:  admin@school.in     / admin123');
  console.log('  Principal:    principal@sunrise.edu.in / school123');
  console.log('  School slug:  demo-school');
  console.log('===================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
