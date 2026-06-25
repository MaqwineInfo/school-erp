/**
 * Full Indian School ERP Seed Script
 * Sunrise International School, Ahmedabad, Gujarat
 * ~500 students | 40 staff | 3 academic years | Complete fees, exams, attendance
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const AcademicYear = require('../models/AcademicYear');
const Standard = require('../models/Standard');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const FeeStructure = require('../models/FeeStructure');
const FeeDemand = require('../models/FeeDemand');
const FeePayment = require('../models/FeePayment');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const Notice = require('../models/Notice');
const Plan = require('../models/Plan');
const Role = require('../models/Role');
const { seedSystemRoles } = require('../utils/roleSeeder');

// ─── Indian Names ───────────────────────────────────────────────────────
const FIRST_NAMES_M = ['Aarav','Arjun','Vivek','Rohan','Karan','Rahul','Amit','Vikram','Suresh','Rajesh','Nikhil','Saurabh','Pranav','Dev','Harsh','Aditya','Ansh','Yash','Dhruv','Rishabh','Parth','Neel','Shivam','Gaurav','Mohit','Ravi','Sachin','Kunal','Deepak','Manish','Tarun','Varun','Siddharth','Akash','Lokesh','Prateek','Uday','Paras','Vipul','Chirag'];
const FIRST_NAMES_F = ['Priya','Ananya','Kavya','Riya','Neha','Sneha','Pooja','Divya','Ishita','Shreya','Aishwarya','Meera','Komal','Nisha','Simran','Anjali','Ritika','Payal','Isha','Bhavya','Kratika','Tanvi','Ruhi','Sakshi','Muskan','Sonal','Heena','Foram','Drashti','Charmi','Dimple','Jahnavi','Khushi','Nidhi','Rachna','Sunita','Urvashi','Varsha','Yamini','Zeel'];
const LAST_NAMES = ['Patel','Shah','Mehta','Joshi','Desai','Sharma','Gupta','Verma','Singh','Kumar','Mishra','Yadav','Trivedi','Pandya','Modi','Dave','Bhatt','Kapoor','Agarwal','Srivastava','Chauhan','Tiwari','Shukla','Nair','Menon','Reddy','Rao','Iyer','Pillai','Krishnan'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const CATEGORIES = ['general','obc','sc','st','ews'];
const CATEGORY_WEIGHTS = [50, 25, 12, 8, 5]; // percentages

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(start, end) { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); }

function randomName(gender) {
  const first = gender === 'male' ? randomItem(FIRST_NAMES_M) : randomItem(FIRST_NAMES_F);
  const last = randomItem(LAST_NAMES);
  return `${first} ${last}`;
}

function randomCategory() {
  const r = Math.random() * 100;
  let sum = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    sum += CATEGORY_WEIGHTS[i];
    if (r < sum) return CATEGORIES[i];
  }
  return 'general';
}

function padZero(n, len = 2) { return String(n).padStart(len, '0'); }

// ─── Connect ─────────────────────────────────────────────────────────────
async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');
}

// ─── Plans ────────────────────────────────────────────────────────────────
async function seedPlans() {
  const plans = [
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Perfect for small schools up to 250 students.',
      pricePerStudentPerYear: 299,
      maxStudents: 250,
      maxBranches: 1,
      includedModules: ['students','academics','attendance','fees','communication','reports'],
      addOnModules: ['transport','library','exams','hr'],
      features: { smsCredits: 200, whatsappEnabled: false, storageGb: 5, backupFrequency: 'weekly', supportSla: '48h' },
      sortOrder: 1,
    },
    {
      name: 'growth',
      displayName: 'Growth',
      description: 'Full-featured for growing schools up to 1000 students.',
      pricePerStudentPerYear: 499,
      maxStudents: 1000,
      maxBranches: 3,
      includedModules: ['admissions','students','academics','attendance','fees','exams','homework','communication','transport','library','hr','payroll','discipline','events','visitors','certificates','reports'],
      addOnModules: ['hostel','health','inventory','expense','multi_branch','ai_features'],
      features: { smsCredits: 1000, whatsappEnabled: true, storageGb: 20, backupFrequency: 'daily', supportSla: '24h' },
      sortOrder: 2,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'All modules, unlimited students, white-label, dedicated support.',
      pricePerStudentPerYear: 799,
      maxStudents: 0,
      maxBranches: 0,
      includedModules: ['admissions','students','academics','attendance','fees','exams','homework','study_material','communication','transport','hostel','library','hr','payroll','discipline','health','events','inventory','expense','visitors','certificates','alumni','reports','website_builder','multi_branch','white_label','ai_features','mobile_app','api_access'],
      addOnModules: [],
      features: { smsCredits: 5000, whatsappEnabled: true, gpsTrackingEnabled: true, onlineMcqEnabled: true, apiAccessEnabled: true, whiteLabelEnabled: true, dedicatedSupport: true, storageGb: 100, backupFrequency: 'daily', supportSla: '4h' },
      sortOrder: 3,
    },
  ];

  for (const p of plans) {
    await Plan.findOneAndUpdate({ name: p.name }, p, { upsert: true, new: true });
  }
  console.log('✅ Plans seeded (3)');
}

// ─── Tenant ───────────────────────────────────────────────────────────────
async function seedTenant() {
  const growthPlan = await Plan.findOne({ name: 'growth' });

  let tenant = await Tenant.findOne({ slug: 'sunrise-international' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Sunrise International School',
      shortName: 'SIS',
      slug: 'sunrise-international',
      board: 'CBSE',
      affiliationNo: '430003045',
      udiseCode: '24010203456',
      managementType: 'private',
      established: 2005,
      address: 'Plot No. 42, Satellite Road, Bopal',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '380058',
      phone: '+91-79-26745678',
      email: 'info@sunriseinternational.edu.in',
      website: 'www.sunriseinternational.edu.in',
      gstin: '24AABCS1234F1Z7',
      primaryColor: '#1a56db',
      planId: growthPlan?._id,
      planName: 'growth',
      status: 'active',
      onboardingCompleted: true,
      subscriptionStartDate: new Date('2024-04-01'),
      subscriptionEndDate: new Date('2027-03-31'),
      enabledModules: growthPlan?.includedModules || [],
      settings: {
        locale: 'en-IN', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY',
        currency: 'INR', academicYearStart: 'april', divisionLabel: 'Division',
        standardLabel: 'Class', rankDisplayEnabled: true, gstEnabled: true, lateFeeEnabled: true,
        attendanceSmsEnabled: true, parentPortalEnabled: true, studentPortalEnabled: true,
      },
    });
    console.log('✅ Tenant created: Sunrise International School');
  } else {
    console.log('ℹ️  Tenant already exists, skipping');
  }
  return tenant;
}

// ─── Branch ───────────────────────────────────────────────────────────────
async function seedBranch(tenantId) {
  let branch = await Branch.findOne({ tenantId, isHeadOffice: true });
  if (!branch) {
    branch = await Branch.create({
      tenantId, name: 'Sunrise International School — Main Campus', code: 'MAIN',
      address: 'Plot No. 42, Satellite Road, Bopal', city: 'Ahmedabad', state: 'Gujarat',
      pinCode: '380058', phone: '+91-79-26745678', email: 'info@sunriseinternational.edu.in',
      isHeadOffice: true, isActive: true,
    });
    console.log('✅ Branch created');
  }
  return branch;
}

// ─── Academic Years ───────────────────────────────────────────────────────
async function seedAcademicYears(tenantId, branchId) {
  const years = [
    { name: '2024-25', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31'), isActive: false },
    { name: '2025-26', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isActive: false },
    { name: '2026-27', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isActive: true },
  ];

  const docs = [];
  for (const y of years) {
    let ay = await AcademicYear.findOneAndUpdate(
      { tenantId, name: y.name },
      { $setOnInsert: { tenantId, branchId, terms: [
        { name: 'Term 1', startDate: y.startDate, endDate: new Date(y.startDate.getFullYear(), 8, 30) },
        { name: 'Term 2', startDate: new Date(y.startDate.getFullYear(), 9, 1), endDate: y.endDate },
      ]}, $set: { startDate: y.startDate, endDate: y.endDate, isActive: y.isActive } },
      { upsert: true, new: true }
    );
    docs.push(ay);
  }
  console.log('✅ Academic years seeded (3)');
  return docs;
}

// ─── Standards ────────────────────────────────────────────────────────────
const STANDARD_DATA = [
  { name: 'Nursery', shortName: 'Nurs', stage: 'pre_primary', order: 0, divisions: ['A','B'] },
  { name: 'LKG', shortName: 'LKG', stage: 'pre_primary', order: 1, divisions: ['A','B'] },
  { name: 'UKG', shortName: 'UKG', stage: 'pre_primary', order: 2, divisions: ['A','B'] },
  { name: 'Class 1', shortName: '1', stage: 'primary', order: 3, divisions: ['A','B','C'] },
  { name: 'Class 2', shortName: '2', stage: 'primary', order: 4, divisions: ['A','B','C'] },
  { name: 'Class 3', shortName: '3', stage: 'primary', order: 5, divisions: ['A','B','C'] },
  { name: 'Class 4', shortName: '4', stage: 'primary', order: 6, divisions: ['A','B','C'] },
  { name: 'Class 5', shortName: '5', stage: 'primary', order: 7, divisions: ['A','B','C'] },
  { name: 'Class 6', shortName: '6', stage: 'middle', order: 8, divisions: ['A','B','C'] },
  { name: 'Class 7', shortName: '7', stage: 'middle', order: 9, divisions: ['A','B','C'] },
  { name: 'Class 8', shortName: '8', stage: 'middle', order: 10, divisions: ['A','B','C'] },
  { name: 'Class 9', shortName: '9', stage: 'secondary', order: 11, divisions: ['A','B','C'] },
  { name: 'Class 10', shortName: '10', stage: 'secondary', order: 12, divisions: ['A','B','C'] },
  { name: 'Class 11 (Science)', shortName: '11S', stage: 'senior_secondary', order: 13, divisions: ['A','B'] },
  { name: 'Class 11 (Commerce)', shortName: '11C', stage: 'senior_secondary', order: 14, divisions: ['A'] },
  { name: 'Class 12 (Science)', shortName: '12S', stage: 'senior_secondary', order: 15, divisions: ['A','B'] },
  { name: 'Class 12 (Commerce)', shortName: '12C', stage: 'senior_secondary', order: 16, divisions: ['A'] },
];

async function seedStandards(tenantId, branchId) {
  const standards = [];
  for (const s of STANDARD_DATA) {
    let doc = await Standard.findOne({ tenantId, shortName: s.shortName });
    if (!doc) {
      doc = await Standard.create({
        tenantId, branchId, name: s.name, shortName: s.shortName,
        stage: s.stage, order: s.order,
        divisions: s.divisions.map(d => ({ name: d, strength: 0 })),
      });
    }
    standards.push(doc);
  }
  console.log(`✅ Standards seeded (${standards.length})`);
  return standards;
}

// ─── Subjects ─────────────────────────────────────────────────────────────
async function seedSubjects(tenantId) {
  const subjectList = [
    { name: 'Mathematics', code: 'MATH', type: 'core' },
    { name: 'Science', code: 'SCI', type: 'core' },
    { name: 'Social Science', code: 'SST', type: 'core' },
    { name: 'English', code: 'ENG', type: 'language' },
    { name: 'Hindi', code: 'HIN', type: 'language' },
    { name: 'Gujarati', code: 'GUJ', type: 'language' },
    { name: 'Sanskrit', code: 'SAN', type: 'language' },
    { name: 'Physics', code: 'PHY', type: 'core' },
    { name: 'Chemistry', code: 'CHEM', type: 'core' },
    { name: 'Biology', code: 'BIO', type: 'elective' },
    { name: 'Computer Science', code: 'CS', type: 'elective' },
    { name: 'Physical Education', code: 'PE', type: 'co_scholastic' },
    { name: 'Drawing & Arts', code: 'ART', type: 'co_scholastic' },
    { name: 'Accountancy', code: 'ACC', type: 'elective' },
    { name: 'Business Studies', code: 'BST', type: 'elective' },
    { name: 'Economics', code: 'ECO', type: 'elective' },
    { name: 'Environmental Education', code: 'EVS', type: 'core' },
    { name: 'Moral Science', code: 'MS', type: 'co_scholastic' },
    { name: 'General Knowledge', code: 'GK', type: 'co_scholastic' },
  ];

  const docs = [];
  for (const s of subjectList) {
    let doc = await Subject.findOne({ tenantId, code: s.code });
    if (!doc) doc = await Subject.create({ tenantId, ...s, isActive: true });
    docs.push(doc);
  }
  console.log(`✅ Subjects seeded (${docs.length})`);
  return docs;
}

// ─── Users & Staff ────────────────────────────────────────────────────────
const STAFF_DATA = [
  // Admins & Management
  { name: 'Dr. Sunita Patel', email: 'principal@sunrise.edu.in', role: 'principal', designation: 'Principal', department: 'Administration', qualifications: 'M.Ed., Ph.D.', experience: 22, salary: 85000 },
  { name: 'Mr. Ramesh Shah', email: 'viceprincipal@sunrise.edu.in', role: 'vice_principal', designation: 'Vice Principal', department: 'Administration', qualifications: 'M.Sc., M.Ed.', experience: 18, salary: 70000 },
  { name: 'Mrs. Kavita Mehta', email: 'admission@sunrise.edu.in', role: 'admission_officer', designation: 'Admission Coordinator', department: 'Admissions', qualifications: 'MBA', experience: 8, salary: 35000 },
  { name: 'Mr. Dilip Joshi', email: 'accountant@sunrise.edu.in', role: 'accountant', designation: 'Senior Accountant', department: 'Finance', qualifications: 'B.Com., CA (Inter)', experience: 12, salary: 42000 },
  { name: 'Mrs. Hetal Desai', email: 'hr@sunrise.edu.in', role: 'hr_manager', designation: 'HR Manager', department: 'HR', qualifications: 'MBA (HR)', experience: 9, salary: 38000 },
  { name: 'Mr. Sanjay Modi', email: 'cashier@sunrise.edu.in', role: 'cashier', designation: 'Fee Cashier', department: 'Finance', qualifications: 'B.Com.', experience: 5, salary: 22000 },
  { name: 'Mr. Ramesh Driver', email: 'driver@sunrise.edu.in', role: 'driver', designation: 'Bus Driver', department: 'Transport', qualifications: 'HMV License', experience: 10, salary: 20000 },

  // Science Teachers
  { name: 'Mr. Anand Sharma', email: 'anand.sharma@sunrise.edu.in', role: 'teacher', designation: 'PGT Physics', department: 'Science', qualifications: 'M.Sc. Physics, B.Ed.', experience: 15, salary: 48000 },
  { name: 'Mrs. Deepa Gupta', email: 'deepa.gupta@sunrise.edu.in', role: 'teacher', designation: 'PGT Chemistry', department: 'Science', qualifications: 'M.Sc. Chemistry, B.Ed.', experience: 12, salary: 45000 },
  { name: 'Mr. Sanjay Verma', email: 'sanjay.verma@sunrise.edu.in', role: 'teacher', designation: 'PGT Biology', department: 'Science', qualifications: 'M.Sc. Botany, B.Ed.', experience: 10, salary: 43000 },
  { name: 'Mrs. Aarti Singh', email: 'aarti.singh@sunrise.edu.in', role: 'class_teacher', designation: 'TGT Science', department: 'Science', qualifications: 'B.Sc., B.Ed.', experience: 8, salary: 38000 },

  // Mathematics Teachers
  { name: 'Mr. Prakash Kumar', email: 'prakash.kumar@sunrise.edu.in', role: 'teacher', designation: 'PGT Mathematics', department: 'Mathematics', qualifications: 'M.Sc. Maths, B.Ed.', experience: 14, salary: 47000 },
  { name: 'Mrs. Smita Mishra', email: 'smita.mishra@sunrise.edu.in', role: 'class_teacher', designation: 'TGT Mathematics', department: 'Mathematics', qualifications: 'B.Sc. Maths, B.Ed.', experience: 9, salary: 37000 },
  { name: 'Mr. Rohit Yadav', email: 'rohit.yadav@sunrise.edu.in', role: 'teacher', designation: 'PRT Mathematics', department: 'Mathematics', qualifications: 'B.A., D.Ed.', experience: 6, salary: 30000 },

  // English Teachers
  { name: 'Mrs. Preethi Nair', email: 'preethi.nair@sunrise.edu.in', role: 'teacher', designation: 'PGT English', department: 'Languages', qualifications: 'M.A. English, B.Ed.', experience: 13, salary: 45000 },
  { name: 'Mr. Vivek Trivedi', email: 'vivek.trivedi@sunrise.edu.in', role: 'class_teacher', designation: 'TGT English', department: 'Languages', qualifications: 'B.A. English, B.Ed.', experience: 7, salary: 35000 },

  // Hindi Teachers
  { name: 'Mrs. Sunita Pandya', email: 'sunita.pandya@sunrise.edu.in', role: 'teacher', designation: 'TGT Hindi', department: 'Languages', qualifications: 'M.A. Hindi, B.Ed.', experience: 11, salary: 36000 },
  { name: 'Mr. Mahesh Modi', email: 'mahesh.modi@sunrise.edu.in', role: 'teacher', designation: 'PRT Hindi', department: 'Languages', qualifications: 'B.A. Hindi, D.Ed.', experience: 5, salary: 28000 },

  // Social Science
  { name: 'Mrs. Rekha Dave', email: 'rekha.dave@sunrise.edu.in', role: 'teacher', designation: 'TGT Social Science', department: 'Humanities', qualifications: 'M.A. History, B.Ed.', experience: 10, salary: 36000 },
  { name: 'Mr. Harish Bhatt', email: 'harish.bhatt@sunrise.edu.in', role: 'teacher', designation: 'TGT Geography', department: 'Humanities', qualifications: 'M.A. Geography, B.Ed.', experience: 8, salary: 35000 },

  // Commerce
  { name: 'Mr. Jignesh Kapoor', email: 'jignesh.kapoor@sunrise.edu.in', role: 'teacher', designation: 'PGT Accountancy', department: 'Commerce', qualifications: 'M.Com., B.Ed.', experience: 9, salary: 42000 },
  { name: 'Mrs. Falguni Agarwal', email: 'falguni.agarwal@sunrise.edu.in', role: 'teacher', designation: 'PGT Business Studies', department: 'Commerce', qualifications: 'MBA, B.Ed.', experience: 7, salary: 40000 },

  // Computer Science
  { name: 'Mr. Rohan Srivastava', email: 'rohan.srivastava@sunrise.edu.in', role: 'teacher', designation: 'TGT Computer Science', department: 'Technology', qualifications: 'MCA, B.Ed.', experience: 6, salary: 38000 },

  // Physical Education
  { name: 'Mr. Arvind Chauhan', email: 'arvind.chauhan@sunrise.edu.in', role: 'teacher', designation: 'PTI', department: 'Sports', qualifications: 'B.P.Ed.', experience: 8, salary: 30000 },
  { name: 'Ms. Priya Tiwari', email: 'priya.tiwari@sunrise.edu.in', role: 'teacher', designation: 'Games Teacher', department: 'Sports', qualifications: 'B.P.Ed.', experience: 4, salary: 28000 },

  // Pre-Primary
  { name: 'Mrs. Bhavna Shukla', email: 'bhavna.shukla@sunrise.edu.in', role: 'class_teacher', designation: 'Pre-Primary Head', department: 'Pre-Primary', qualifications: 'Montessori Training, NTT', experience: 12, salary: 32000 },
  { name: 'Mrs. Heena Menon', email: 'heena.menon@sunrise.edu.in', role: 'teacher', designation: 'Nursery Teacher', department: 'Pre-Primary', qualifications: 'NTT', experience: 5, salary: 22000 },
  { name: 'Mrs. Dimple Reddy', email: 'dimple.reddy@sunrise.edu.in', role: 'teacher', designation: 'LKG Teacher', department: 'Pre-Primary', qualifications: 'NTT', experience: 4, salary: 22000 },
  { name: 'Mrs. Foram Rao', email: 'foram.rao@sunrise.edu.in', role: 'teacher', designation: 'UKG Teacher', department: 'Pre-Primary', qualifications: 'NTT, B.Ed.', experience: 6, salary: 24000 },

  // Support Staff
  { name: 'Mrs. Jasmine Iyer', email: 'librarian@sunrise.edu.in', role: 'librarian', designation: 'Librarian', department: 'Library', qualifications: 'B.Lib.', experience: 10, salary: 28000 },
  { name: 'Mr. Bharat Pillai', email: 'transport@sunrise.edu.in', role: 'transport_incharge', designation: 'Transport In-charge', department: 'Transport', qualifications: 'B.Com.', experience: 7, salary: 25000 },
  { name: 'Mr. Kishan Krishnan', email: 'hostel@sunrise.edu.in', role: 'hostel_warden', designation: 'Hostel Warden', department: 'Hostel', qualifications: 'B.A.', experience: 6, salary: 24000 },
  { name: 'Mrs. Manasi Pillai', email: 'nurse@sunrise.edu.in', role: 'staff', designation: 'School Nurse', department: 'Health', qualifications: 'GNM', experience: 8, salary: 25000 },
  { name: 'Mr. Chirag Rao', email: 'reception@sunrise.edu.in', role: 'receptionist', designation: 'Senior Receptionist', department: 'Administration', qualifications: 'B.A., DCA', experience: 5, salary: 18000 },

  // Drawing & Music
  { name: 'Mr. Dilip Sharma', email: 'art@sunrise.edu.in', role: 'teacher', designation: 'Art Teacher', department: 'Arts', qualifications: 'B.F.A.', experience: 9, salary: 26000 },
  { name: 'Mrs. Sangeeta Patel', email: 'music@sunrise.edu.in', role: 'teacher', designation: 'Music Teacher', department: 'Arts', qualifications: 'B.Music', experience: 7, salary: 24000 },

  // Extra
  { name: 'Mr. Vaibhav Desai', email: 'vaibhav.desai@sunrise.edu.in', role: 'teacher', designation: 'TGT EVS', department: 'Science', qualifications: 'B.Sc., B.Ed.', experience: 5, salary: 30000 },
  { name: 'Mrs. Kajal Singh', email: 'kajal.singh@sunrise.edu.in', role: 'teacher', designation: 'PRT Class 3', department: 'Primary', qualifications: 'B.A., D.Ed.', experience: 3, salary: 24000 },
  { name: 'Mr. Yashpal Kumar', email: 'yashpal.kumar@sunrise.edu.in', role: 'teacher', designation: 'PRT Class 4', department: 'Primary', qualifications: 'B.A., D.Ed.', experience: 4, salary: 25000 },
  { name: 'Mrs. Priyanka Mehta', email: 'priyanka.mehta@sunrise.edu.in', role: 'teacher', designation: 'PRT Class 5', department: 'Primary', qualifications: 'B.A., D.Ed.', experience: 6, salary: 27000 },
];

async function seedUsers(tenantId) {
  const password = await bcrypt.hash('password@123', 12);
  // Create super admin
  await User.findOneAndUpdate(
    { email: 'admin@schoolerp.in', isSuperAdmin: true },
    { name: 'Super Admin', email: 'admin@schoolerp.in', passwordHash: password, role: 'super_admin', isSuperAdmin: true, isActive: true },
    { upsert: true, new: true }
  );

  await seedSystemRoles(tenantId);

  const staffDocs = [];
  for (let i = 0; i < STAFF_DATA.length; i++) {
    const s = STAFF_DATA[i];
    let user = await User.findOne({ email: s.email, tenantId });
    if (!user) {
      const principalRole = await Role.findOne({ tenantId, slug: s.role === 'principal' ? 'principal' : s.role.replace('_', '_') });
      user = await User.create({
        tenantId, name: s.name, email: s.email, passwordHash: password,
        role: s.role, roleId: principalRole?._id, phone: `+91${randomInt(7000000000, 9999999999)}`, isActive: true,
      });
    }

    let staffDoc = await Staff.findOne({ tenantId, userId: user._id });
    if (!staffDoc) {
      const empNo = i + 1;
      const joinDate = randomDate(new Date('2010-04-01'), new Date('2024-03-31'));
      staffDoc = await Staff.create({
        tenantId, userId: user._id, name: s.name, employeeId: `EMP${padZero(empNo, 4)}`,
        designation: s.designation, department: s.department,
        qualification: [{ degree: s.qualifications, institution: 'University of Gujarat', year: 2010 + randomInt(0, 8), percentage: randomInt(60, 90) }],
        experience: s.experience > 0 ? [{ school: 'Previous School', from: new Date(Date.now() - s.experience * 365 * 24 * 3600 * 1000), to: joinDate, role: s.designation }] : [],
        joiningDate: joinDate,
        phone: user.phone, email: s.email,
        gender: s.name.startsWith('Mr.') ? 'male' : 'female',
        bankAccount: { number: `${randomInt(100000000000, 999999999999)}`, ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
        isActive: true,
      });
    }
    staffDocs.push(staffDoc);
  }
  console.log(`✅ Users/Staff seeded (${STAFF_DATA.length} staff + 1 super admin)`);
  return staffDocs;
}

// ─── Students ─────────────────────────────────────────────────────────────
async function seedStudents(tenantId, branchId, standards, academicYears) {
  const currentYear = academicYears.find(y => y.isActive);
  const existingCount = await Student.countDocuments({ tenantId });
  if (existingCount >= 400) { console.log(`ℹ️  Students already seeded (${existingCount})`); return; }

  const students = [];
  let admNo = 10001;

  for (const std of standards) {
    for (const div of std.divisions) {
      const count = std.stage === 'pre_primary' ? 25 : std.stage === 'sr_secondary' ? 30 : 35;
      for (let i = 0; i < count; i++) {
        const gender = Math.random() > 0.48 ? 'male' : 'female';
        const name = randomName(gender);
        const fatherName = randomName('male');
        const motherName = randomName('female');
        const dob = randomDate(new Date('2005-01-01'), new Date('2018-12-31'));
        const cat = randomCategory();

        students.push({
          tenantId, branchId,
          academicYearId: currentYear._id,
          standardId: std._id,
          standardName: std.name,
          divisionName: div.name,
          admissionNo: `SIS${admNo++}`,
          name, gender, dateOfBirth: dob,
          bloodGroup: randomItem(BLOOD_GROUPS),
          category: cat,
          religion: randomItem(['hindu','muslim','christian','sikh','jain','other']),
          nationality: 'Indian',
          motherTongue: randomItem(['gujarati','hindi','english','marathi','punjabi']),
          aadharNo: `${randomInt(200000000000, 999999999999)}`,
          fatherName,
          motherName,
          guardianName: fatherName,
          guardianRelation: 'father',
          phone: `+91${randomInt(7000000000, 9999999999)}`,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}${admNo}@gmail.com`,
          address: `${randomInt(1, 99)}, ${randomItem(['Vastrapur','Navrangpura','Bopal','Paldi','Maninagar','Ghatlodia','Chandkheda','Motera'])} Society, Ahmedabad`,
          city: 'Ahmedabad', state: 'Gujarat', pinCode: `38${randomInt(1000, 9999)}`,
          admissionDate: new Date(`${2024 - Math.floor(std.order / 3)}-06-${randomInt(1, 15)}`),
          rteAdmission: cat === 'st' || cat === 'sc' ? Math.random() > 0.5 : false,
          previousSchool: Math.random() > 0.7 ? `${randomItem(['Delhi Public School','Kendriya Vidyalaya','Ryan International','St. Xavier\'s'])} - ${randomItem(['Ahmedabad','Surat','Vadodara'])}` : null,
          status: 'active',
          rollNo: i + 1,
          busRouteNo: Math.random() > 0.4 ? randomInt(1, 8) : null,
          hostelAllocation: Math.random() > 0.9 ? { blockName: `Block ${randomItem(['A','B','C'])}`, roomNo: `${randomInt(101, 250)}` } : null,
        });
      }
    }
  }

  await Student.insertMany(students);
  console.log(`✅ Students seeded (~${students.length})`);
  return students;
}

// ─── Fee Structures ───────────────────────────────────────────────────────
async function seedFeeStructures(tenantId, branchId, standards, academicYears) {
  const currentYear = academicYears.find(y => y.isActive);
  const exists = await FeeStructure.findOne({ tenantId, academicYearId: currentYear._id });
  if (exists) { console.log('ℹ️  Fee structures already seeded'); return; }

  const structures = [
    {
      name: 'Pre-Primary Fee Structure 2026-27',
      applicableStages: ['pre_primary'],
      components: [
        { name: 'Tuition Fee', amount: 18000, isMandatory: true, taxable: false },
        { name: 'Activity Fee', amount: 3600, isMandatory: true, taxable: false },
        { name: 'Development Fee', amount: 5000, isMandatory: true, taxable: false },
        { name: 'Computer Fee', amount: 1200, isMandatory: false, taxable: false },
        { name: 'Annual Charges', amount: 2500, isMandatory: true, taxable: false },
      ],
      installments: [
        { name: 'Q1 (Apr-Jun)', dueDate: new Date('2026-04-10'), percentage: 25 },
        { name: 'Q2 (Jul-Sep)', dueDate: new Date('2026-07-10'), percentage: 25 },
        { name: 'Q3 (Oct-Dec)', dueDate: new Date('2026-10-10'), percentage: 25 },
        { name: 'Q4 (Jan-Mar)', dueDate: new Date('2027-01-10'), percentage: 25 },
      ],
    },
    {
      name: 'Primary Fee Structure 2026-27 (Class 1-5)',
      applicableStages: ['primary'],
      components: [
        { name: 'Tuition Fee', amount: 24000, isMandatory: true, taxable: false },
        { name: 'Activity Fee', amount: 4800, isMandatory: true, taxable: false },
        { name: 'Development Fee', amount: 8000, isMandatory: true, taxable: false },
        { name: 'Computer Fee', amount: 2400, isMandatory: false, taxable: false },
        { name: 'Sports Fee', amount: 1800, isMandatory: true, taxable: false },
        { name: 'Library Fee', amount: 1200, isMandatory: true, taxable: false },
        { name: 'Annual Charges', amount: 3500, isMandatory: true, taxable: false },
      ],
      installments: [
        { name: 'Q1 (Apr-Jun)', dueDate: new Date('2026-04-10'), percentage: 25 },
        { name: 'Q2 (Jul-Sep)', dueDate: new Date('2026-07-10'), percentage: 25 },
        { name: 'Q3 (Oct-Dec)', dueDate: new Date('2026-10-10'), percentage: 25 },
        { name: 'Q4 (Jan-Mar)', dueDate: new Date('2027-01-10'), percentage: 25 },
      ],
    },
    {
      name: 'Middle School Fee Structure 2026-27 (Class 6-8)',
      applicableStages: ['middle'],
      components: [
        { name: 'Tuition Fee', amount: 30000, isMandatory: true, taxable: false },
        { name: 'Activity Fee', amount: 6000, isMandatory: true, taxable: false },
        { name: 'Development Fee', amount: 10000, isMandatory: true, taxable: false },
        { name: 'Computer Lab Fee', amount: 3600, isMandatory: false, taxable: false },
        { name: 'Sports Fee', amount: 2400, isMandatory: true, taxable: false },
        { name: 'Library Fee', amount: 1800, isMandatory: true, taxable: false },
        { name: 'Annual Charges', amount: 4500, isMandatory: true, taxable: false },
      ],
      installments: [
        { name: 'Term 1 (Apr-Sep)', dueDate: new Date('2026-04-10'), percentage: 50 },
        { name: 'Term 2 (Oct-Mar)', dueDate: new Date('2026-10-10'), percentage: 50 },
      ],
    },
    {
      name: 'Secondary Fee Structure 2026-27 (Class 9-10)',
      applicableStages: ['secondary'],
      components: [
        { name: 'Tuition Fee', amount: 36000, isMandatory: true, taxable: false },
        { name: 'Activity Fee', amount: 7200, isMandatory: true, taxable: false },
        { name: 'Development Fee', amount: 12000, isMandatory: true, taxable: false },
        { name: 'Computer Lab Fee', amount: 4800, isMandatory: false, taxable: false },
        { name: 'Sports Fee', amount: 3000, isMandatory: true, taxable: false },
        { name: 'Library Fee', amount: 2400, isMandatory: true, taxable: false },
        { name: 'Board Exam Fee', amount: 2000, isMandatory: true, taxable: false },
        { name: 'Annual Charges', amount: 5000, isMandatory: true, taxable: false },
      ],
      installments: [
        { name: 'Term 1 (Apr-Sep)', dueDate: new Date('2026-04-10'), percentage: 50 },
        { name: 'Term 2 (Oct-Mar)', dueDate: new Date('2026-10-10'), percentage: 50 },
      ],
    },
    {
      name: 'Sr. Secondary Fee Structure 2026-27 (Class 11-12)',
      applicableStages: ['senior_secondary'],
      components: [
        { name: 'Tuition Fee', amount: 42000, isMandatory: true, taxable: false },
        { name: 'Activity Fee', amount: 8400, isMandatory: true, taxable: false },
        { name: 'Development Fee', amount: 15000, isMandatory: true, taxable: false },
        { name: 'Computer Lab Fee', amount: 6000, isMandatory: false, taxable: false },
        { name: 'Science/Commerce Lab', amount: 6000, isMandatory: false, taxable: false },
        { name: 'Sports Fee', amount: 3600, isMandatory: true, taxable: false },
        { name: 'Library Fee', amount: 3000, isMandatory: true, taxable: false },
        { name: 'Board Exam Fee', amount: 3500, isMandatory: true, taxable: false },
        { name: 'Annual Charges', amount: 6000, isMandatory: true, taxable: false },
      ],
      installments: [
        { name: 'Term 1 (Apr-Sep)', dueDate: new Date('2026-04-10'), percentage: 50 },
        { name: 'Term 2 (Oct-Mar)', dueDate: new Date('2026-10-10'), percentage: 50 },
      ],
    },
  ];

  for (const fs of structures) {
    await FeeStructure.create({ tenantId, branchId, academicYearId: currentYear._id, ...fs, isActive: true });
  }
  console.log(`✅ Fee structures seeded (${structures.length})`);
}

// ─── Exams ────────────────────────────────────────────────────────────────
async function seedExams(tenantId, branchId, academicYears) {
  const currentYear = academicYears.find(y => y.isActive);
  const exists = await Exam.findOne({ tenantId, academicYearId: currentYear._id });
  if (exists) { console.log('ℹ️  Exams already seeded'); return; }

  const exams = [
    { name: 'Unit Test 1', type: 'unit_test', term: 'Term 1', startDate: new Date('2026-05-15'), endDate: new Date('2026-05-20'), maxMarks: 20, passingMarks: 8, weightage: 10 },
    { name: 'Half Yearly Examination', type: 'half_yearly', term: 'Term 1', startDate: new Date('2026-09-15'), endDate: new Date('2026-09-25'), maxMarks: 80, passingMarks: 26, weightage: 40 },
    { name: 'Unit Test 2', type: 'unit_test', term: 'Term 2', startDate: new Date('2026-11-15'), endDate: new Date('2026-11-20'), maxMarks: 20, passingMarks: 8, weightage: 10 },
    { name: 'Annual Examination', type: 'annual', term: 'Term 2', startDate: new Date('2027-02-15'), endDate: new Date('2027-02-28'), maxMarks: 80, passingMarks: 26, weightage: 40 },
    { name: 'Pre-Board Examination (Class 10)', type: 'pre_board', term: 'Term 2', startDate: new Date('2027-01-05'), endDate: new Date('2027-01-15'), maxMarks: 80, passingMarks: 26, weightage: 0, applicableStandards: ['Class 10'] },
    { name: 'Pre-Board Examination (Class 12)', type: 'pre_board', term: 'Term 2', startDate: new Date('2027-01-06'), endDate: new Date('2027-01-16'), maxMarks: 80, passingMarks: 26, weightage: 0, applicableStandards: ['Class 12 (Science)', 'Class 12 (Commerce)'] },
  ];

  await Exam.insertMany(exams.map(e => ({ tenantId, branchId, academicYearId: currentYear._id, ...e, status: 'published' })));
  console.log(`✅ Exams seeded (${exams.length})`);
}

// ─── Notices ──────────────────────────────────────────────────────────────
async function seedNotices(tenantId) {
  const exists = await Notice.findOne({ tenantId });
  if (exists) { console.log('ℹ️  Notices already seeded'); return; }

  const notices = [
    { title: 'Annual Day Celebration 2026', content: 'Dear Parents, we are pleased to announce our Annual Day on 15th January 2027. All students are requested to participate in the cultural events. Registration forms available from the class teacher.', type: 'event', publishAt: new Date('2026-10-01') },
    { title: 'CBSE Board Exam 2027 Date Sheet Released', content: 'The CBSE Board Examination 2027 date sheet has been released. Class 10 exams begin on 15th February 2027 and Class 12 on 11th February 2027. Students may collect the detailed schedule from the school office.', type: 'academic', publishAt: new Date('2026-10-15') },
    { title: 'Fee Payment Reminder — Q3 Installment Due', content: 'This is to remind all parents that Q3 fee installment (Oct-Dec) is due by 10th October 2026. Parents are requested to clear dues on time to avoid late fee penalty.', type: 'fee', publishAt: new Date('2026-10-01') },
    { title: 'Winter Uniform from 1st November', content: 'All students are advised to wear winter uniform from 1st November 2026. The winter uniform includes school blazer, woollen socks and school scarf. Please ensure proper grooming.', type: 'general', publishAt: new Date('2026-10-20') },
    { title: 'Parent-Teacher Meeting — Class 9 & 10', content: 'Parent-Teacher Meeting for Classes 9 and 10 is scheduled on Saturday, 25th October 2026 from 9:00 AM to 1:00 PM. Parents are requested to meet subject teachers and discuss academic progress.', type: 'event', publishAt: new Date('2026-10-10') },
    { title: 'National Science Olympiad Registration Open', content: 'Registration for National Science Olympiad (NSO) is now open. Interested students from Class 3 to 12 may register through their class teacher by 31st October 2026. Registration fee: ₹150.', type: 'academic', publishAt: new Date('2026-10-05') },
    { title: 'Diwali Vacation — 20th to 27th October', content: 'School will remain closed from 20th October 2026 (Saturday) to 27th October 2026 (Sunday) for Diwali holidays. School will reopen on Monday, 28th October 2026.', type: 'general', publishAt: new Date('2026-10-10') },
    { title: 'New Transport Route 8 Added — Thaltej Area', content: 'We are pleased to announce a new bus route (Route 8) covering Thaltej, Bodakdev and SG Highway areas. Parents in these areas who wish to enrol for bus facility may contact the Transport In-charge.', type: 'other', publishAt: new Date('2026-09-15') },
    { title: 'Blood Donation Camp — 5th November', content: 'Sunrise International School in association with the Indian Red Cross Society is organising a Blood Donation Camp on 5th November 2026. All staff members aged 18-60 are encouraged to participate.', type: 'event', publishAt: new Date('2026-10-25') },
    { title: 'Staff Meeting — 30th October 2026', content: 'A mandatory staff meeting is scheduled on 30th October 2026 at 3:30 PM in the Conference Hall. All teaching and non-teaching staff must attend. Meeting agenda: Academic calendar review, examination guidelines and conduct report.', type: 'general', publishAt: new Date('2026-10-22') },
  ];

  await Notice.insertMany(notices.map(n => ({ tenantId, ...n, isPublished: true })));
  console.log(`✅ Notices seeded (${notices.length})`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
async function main() {
  await connect();
  console.log('\n🌱 Starting full seed...\n');

  await seedPlans();
  const tenant = await seedTenant();
  const tenantId = tenant._id;
  const branch = await seedBranch(tenantId);
  const academicYears = await seedAcademicYears(tenantId, branch._id);
  const standards = await seedStandards(tenantId, branch._id);
  await seedSubjects(tenantId);
  await seedUsers(tenantId);
  await seedStudents(tenantId, branch._id, standards, academicYears);
  await seedFeeStructures(tenantId, branch._id, standards, academicYears);
  await seedExams(tenantId, branch._id, academicYears);
  await seedNotices(tenantId);

  console.log('\n✅ Full seed completed!');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏫  School: Sunrise International School, Ahmedabad');
  console.log('🌐  Slug: sunrise-international');
  console.log('\n📋  Login Credentials:');
  console.log('   Super Admin : admin@schoolerp.in      / password@123');
  console.log('   Principal   : principal@sunrise.edu.in / password@123');
  console.log('   Accountant  : accountant@sunrise.edu.in / password@123');
  console.log('   Teacher     : anand.sharma@sunrise.edu.in / password@123');
  console.log('   Parent      : parent1@sunrise.edu.in     / password@123');
  console.log('   Parent 2    : parent2@sunrise.edu.in     / password@123');
  console.log('   Student     : student1@sunrise.edu.in    / password@123');
  console.log('   Student 2   : student2@sunrise.edu.in    / password@123');
  console.log('   Student 3   : student3@sunrise.edu.in    / password@123');
  console.log('   (Run seed-portal-users.js if parent/student logins fail)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
}

main().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
