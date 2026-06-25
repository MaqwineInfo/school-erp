/**
 * Seed Parent & Student portal users with linked demo students
 * Run: node src/scripts/seed-portal-users.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Student = require('../models/Student');
const Standard = require('../models/Standard');
const AcademicYear = require('../models/AcademicYear');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const DEMO_STUDENTS = [
  {
    admissionNo: 'SIS-DEMO-001',
    name: 'Aarav Patel',
    gender: 'male',
    divisionName: 'A',
    standardShort: '8',
    guardians: [
      { relation: 'father', name: 'Rajesh Patel', phone: '+919876543210', email: 'parent1@sunrise.edu.in', occupation: 'Business' },
      { relation: 'mother', name: 'Priya Patel', phone: '+919876543211', email: 'parent1@sunrise.edu.in', occupation: 'Homemaker' },
    ],
  },
  {
    admissionNo: 'SIS-DEMO-002',
    name: 'Ananya Patel',
    gender: 'female',
    divisionName: 'A',
    standardShort: '8',
    guardians: [
      { relation: 'father', name: 'Rajesh Patel', phone: '+919876543210', email: 'parent1@sunrise.edu.in', occupation: 'Business' },
      { relation: 'mother', name: 'Priya Patel', phone: '+919876543211', email: 'parent1@sunrise.edu.in', occupation: 'Homemaker' },
    ],
  },
  {
    admissionNo: 'SIS-DEMO-003',
    name: 'Rohan Mehta',
    gender: 'male',
    divisionName: 'A',
    standardShort: '10',
    guardians: [
      { relation: 'father', name: 'Suresh Mehta', phone: '+919876543212', email: 'parent2@sunrise.edu.in', occupation: 'Engineer' },
      { relation: 'mother', name: 'Neha Mehta', phone: '+919876543213', email: 'parent2@sunrise.edu.in', occupation: 'Teacher' },
    ],
  },
];

const PORTAL_USERS = [
  { name: 'Mr. Sanjay Modi', email: 'cashier@sunrise.edu.in', role: 'cashier', phone: '+919876543214' },
  { name: 'Mr. Ramesh Driver', email: 'driver@sunrise.edu.in', role: 'driver', phone: '+919876543215' },
  {
    name: 'Rajesh Patel',
    email: 'parent1@sunrise.edu.in',
    role: 'parent',
    phone: '+919876543210',
    linkAdmissionNos: ['SIS-DEMO-001', 'SIS-DEMO-002'],
  },
  {
    name: 'Suresh Mehta',
    email: 'parent2@sunrise.edu.in',
    role: 'parent',
    phone: '+919876543212',
    linkAdmissionNos: ['SIS-DEMO-003'],
  },
  {
    name: 'Aarav Patel',
    email: 'student1@sunrise.edu.in',
    role: 'student',
    phone: '+919876543220',
    linkAdmissionNo: 'SIS-DEMO-001',
  },
  {
    name: 'Ananya Patel',
    email: 'student2@sunrise.edu.in',
    role: 'student',
    phone: '+919876543221',
    linkAdmissionNo: 'SIS-DEMO-002',
  },
  {
    name: 'Rohan Mehta',
    email: 'student3@sunrise.edu.in',
    role: 'student',
    phone: '+919876543222',
    linkAdmissionNo: 'SIS-DEMO-003',
  },
];

async function upsertStudent(tenantId, branchId, academicYearId, standards, demo) {
  const standard = standards.find(s => s.shortName === demo.standardShort || s.name === `Class ${demo.standardShort}`);
  if (!standard) throw new Error(`Standard not found for ${demo.standardShort}`);

  let student = await Student.findOne({ tenantId, admissionNo: demo.admissionNo, deletedAt: null });
  if (!student) {
    student = await Student.create({
      tenantId,
      branchId,
      academicYearId,
      standardId: standard._id,
      divisionName: demo.divisionName,
      admissionNo: demo.admissionNo,
      grNo: demo.admissionNo.replace('SIS-DEMO-', 'GR'),
      rollNo: demo.admissionNo.slice(-1),
      name: demo.name,
      gender: demo.gender,
      dob: new Date('2012-05-15'),
      bloodGroup: 'B+',
      category: 'general',
      religion: 'hindu',
      motherTongue: 'gujarati',
      currentAddress: '42, Satellite Road, Bopal, Ahmedabad',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '380058',
      guardians: demo.guardians,
      admissionDate: new Date('2024-06-01'),
      status: 'active',
    });
    console.log(`  ✅ Created student: ${student.name} (${student.admissionNo})`);
  } else {
    console.log(`  ℹ️  Student exists: ${student.name} (${student.admissionNo})`);
  }
  return student;
}

async function upsertPortalUser(tenantId, branchId, passwordHash, portalUser, studentMap) {
  let user = await User.findOne({ email: portalUser.email, tenantId, deletedAt: null });

  const linkedStudentIds = portalUser.linkAdmissionNos
    ? portalUser.linkAdmissionNos.map(no => studentMap[no]._id)
    : undefined;

  const studentId = portalUser.linkAdmissionNo
    ? studentMap[portalUser.linkAdmissionNo]._id
    : undefined;

  const payload = {
    tenantId,
    branchId,
    name: portalUser.name,
    email: portalUser.email,
    passwordHash,
    role: portalUser.role,
    phone: portalUser.phone,
    isActive: true,
    ...(linkedStudentIds ? { linkedStudentIds } : {}),
    ...(studentId ? { studentId } : {}),
  };

  if (!user) {
    user = await User.create(payload);
    console.log(`  ✅ Created ${portalUser.role}: ${portalUser.email}`);
  } else {
    await User.updateOne({ _id: user._id }, { $set: payload });
    console.log(`  ℹ️  Updated ${portalUser.role}: ${portalUser.email}`);
  }
  return user;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const tenant = await Tenant.findOne({ slug: 'sunrise-international', deletedAt: null });
  if (!tenant) {
    console.error('❌ Tenant "sunrise-international" not found. Run seed-full.js first.');
    process.exit(1);
  }

  const branch = await Branch.findOne({ tenantId: tenant._id, isHeadOffice: true });
  const academicYear = await AcademicYear.findOne({ tenantId: tenant._id, isActive: true });
  const standards = await Standard.find({ tenantId: tenant._id });

  if (!branch || !academicYear || standards.length === 0) {
    console.error('❌ Missing branch, academic year, or standards. Run seed-full.js first.');
    process.exit(1);
  }

  console.log('📚 Seeding demo students...');
  const studentMap = {};
  for (const demo of DEMO_STUDENTS) {
    const student = await upsertStudent(tenant._id, branch._id, academicYear._id, standards, demo);
    studentMap[demo.admissionNo] = student;
  }

  console.log('\n👨‍👩‍👧 Seeding portal users...');
  const passwordHash = await bcrypt.hash('password@123', 12);
  for (const portalUser of PORTAL_USERS) {
    await upsertPortalUser(tenant._id, branch._id, passwordHash, portalUser, studentMap);
  }

  console.log('\n✅ Portal users seeded successfully!');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('School Code: sunrise-international');
  console.log('Password:    password@123');
  console.log('\nParent Logins:');
  console.log('  parent1@sunrise.edu.in  → children: Aarav & Ananya Patel');
  console.log('  parent2@sunrise.edu.in  → child:    Rohan Mehta');
  console.log('\nStudent Logins:');
  console.log('  student1@sunrise.edu.in → Aarav Patel (Class 8-A)');
  console.log('  student2@sunrise.edu.in → Ananya Patel (Class 8-A)');
  console.log('  student3@sunrise.edu.in → Rohan Mehta (Class 10-A)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
