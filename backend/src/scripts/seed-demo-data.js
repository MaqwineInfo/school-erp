/**
 * Populate the bootstrap demo tenant with representative records for every module.
 *
 * `bootstrap.js` produces a correctly-wired tenant — new-RBAC roles, workflows, classes,
 * users — but no transactional data, so there is nothing to look at once you sign in.
 * `seed-full.js` has the volume but writes the pre-migration shapes (legacy
 * `Role.permissions[]`, rupee amounts, `FeeStructure.components` without `feeHeadId`),
 * so its tenant cannot exercise the module layer.
 *
 * This script fills that gap: it writes today's schema shapes into the tenant bootstrap
 * created, so every screen and every legacy route has rows to return.
 *
 * All money is integer PAISE (ADR-07).
 *
 * Run:  node src/scripts/seed-demo-data.js [--reset]
 *       --reset clears only the collections this script writes, not the tenant itself.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const config = require('../config/env');

function registerModels() {
  const dir = path.join(__dirname, '..', 'models');
  fs.readdirSync(dir).filter((f) => f.endsWith('.js')).forEach((f) => require(path.join(dir, f)));
}

const SLUG = process.env.DEMO_TENANT_SLUG || 'demo';
const RUPEE = 100; // paise per rupee

// ─── Deterministic pseudo-randomness ─────────────────────────────────────────
// Seeded so a re-run produces the same names and marks — a demo database that
// reshuffles itself on every seed makes "did my change break this?" unanswerable.
let _seed = 20260817;
function rnd() {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;

const FIRST_M = ['Aarav', 'Arjun', 'Vivek', 'Rohan', 'Karan', 'Rahul', 'Amit', 'Vikram', 'Nikhil', 'Pranav', 'Dev', 'Harsh', 'Aditya', 'Yash', 'Dhruv', 'Parth', 'Shivam', 'Mohit', 'Kunal', 'Varun'];
const FIRST_F = ['Priya', 'Ananya', 'Kavya', 'Riya', 'Neha', 'Sneha', 'Pooja', 'Divya', 'Ishita', 'Shreya', 'Meera', 'Nisha', 'Anjali', 'Isha', 'Tanvi', 'Sakshi', 'Nidhi', 'Khushi', 'Zeel', 'Foram'];
const LAST = ['Patel', 'Shah', 'Mehta', 'Joshi', 'Desai', 'Sharma', 'Gupta', 'Verma', 'Singh', 'Trivedi', 'Pandya', 'Modi', 'Dave', 'Bhatt', 'Nair', 'Reddy', 'Iyer'];
const CATEGORIES = ['general', 'general', 'general', 'obc', 'obc', 'sc', 'st', 'ews'];
const BLOOD = ['A+', 'B+', 'O+', 'AB+', 'A-', 'O-'];

function personName(gender) {
  return `${gender === 'male' ? pick(FIRST_M) : pick(FIRST_F)} ${pick(LAST)}`;
}
function pad(n, len = 4) { return String(n).padStart(len, '0'); }

async function main() {
  const reset = process.argv.includes('--reset');

  await mongoose.connect(config.db.uri);
  registerModels();
  console.log(`Connected to ${mongoose.connection.name}`);

  const M = (n) => mongoose.model(n);

  const tenant = await M('Tenant').findOne({ slug: SLUG, deletedAt: null });
  if (!tenant) {
    console.error(`Tenant "${SLUG}" not found. Run  npm run bootstrap  first.`);
    process.exit(1);
  }
  const tenantId = tenant._id;

  const branch = await M('Branch').findOne({ tenantId, deletedAt: null });
  const year = await M('AcademicYear').findOne({ tenantId, isActive: true, deletedAt: null });
  const branchId = branch._id;
  const academicYearId = year._id;

  const standards = await M('Standard').find({ tenantId, deletedAt: null }).sort({ order: 1 });
  const groups = await M('AcademicGroup').find({ tenantId, academicYearId, deletedAt: null });
  const subjects = await M('Subject').find({ tenantId, deletedAt: null });
  const users = await M('User').find({ tenantId, deletedAt: null });

  const byEmail = (local) => users.find((u) => u.email === `${local}@${SLUG}.school`);
  const principal = byEmail('principal');
  const teacherUser = byEmail('teacher');
  const ct8a = byEmail('ct8a');
  const accountant = byEmail('accounts');
  const librarian = byEmail('library');

  const stdByName = Object.fromEntries(standards.map((s) => [s.name, s]));
  const groupsOf = (stdName) => groups.filter((g) => String(g.standardId) === String(stdByName[stdName]?._id));
  const subjByName = Object.fromEntries(subjects.map((s) => [s.name, s]));

  console.log(`Tenant ${tenant.name} · branch ${branch.name} · year ${year.name}`);
  console.log(`  ${standards.length} classes · ${groups.length} sections · ${subjects.length} subjects\n`);

  // Collections this script owns. --reset clears exactly these, tenant-scoped.
  const OWNED = [
    'Student', 'Enrolment', 'Staff', 'Department', 'FeeHead', 'FeeStructure', 'FeeDemand',
    'FeePayment', 'Concession', 'Attendance', 'Exam', 'MarksEntry', 'GradeScheme',
    'Timetable', 'Homework', 'StudyMaterial', 'Syllabus', 'Book', 'BookIssue',
    'Vehicle', 'Route', 'HostelRoom', 'HostelAllocation', 'Inventory', 'Expense',
    'Visitor', 'Leave', 'Payroll', 'Notice', 'Event', 'Enquiry', 'Certificate',
    'DisciplineRecord', 'HealthRecord', 'Alumni', 'Task', 'MealMenu',
  ];
  if (reset) {
    for (const n of OWNED) await M(n).deleteMany({ tenantId });
    console.log(`--reset: cleared ${OWNED.length} collections for this tenant\n`);
  }

  const report = [];
  const note = (label, n) => { report.push([label, n]); console.log(`  ${label.padEnd(22)} ${n}`); };

  /** Insert only when the collection is empty for this tenant — re-runs stay idempotent. */
  async function fill(modelName, label, build) {
    const Model = M(modelName);
    const existing = await Model.countDocuments({ tenantId });
    if (existing > 0) { note(label, `${existing} (kept)`); return null; }
    const docs = await build();
    if (!docs || !docs.length) { note(label, 0); return []; }
    // Ordered insert on purpose: `{ ordered: false }` makes Mongoose drop documents that
    // fail validation and return the survivors, so a schema mismatch shows up as a quietly
    // short collection rather than an error. A seed that half-writes is worse than one that
    // stops.
    const created = await Model.insertMany(docs);
    if (created.length !== docs.length) {
      throw new Error(`${modelName}: inserted ${created.length} of ${docs.length}`);
    }
    note(label, created.length);
    return created;
  }

  // ── Teaching assignments ───────────────────────────────────────────────────
  // `platform/scope/assignmentProvider` resolves `dataScope: 'division'` and
  // `studentScope: 'assigned_students'` from `AcademicGroup.inchargeId`. Without an
  // in-charge, a class teacher's scope resolves to nothing and every class-scoped screen
  // comes back empty — which reads as a permission bug rather than missing demo data.
  console.log('Organisation');
  {
    const class8 = standards.find((s) => s.name === 'Class 8');
    const class8A = groups.find((g) => String(g.standardId) === String(class8?._id) && g.name === 'A');
    const assignments = [];
    if (class8A && ct8a) assignments.push({ group: class8A, user: ct8a });
    // The subject teacher owns two other sections, so "my classes" is never a single row.
    for (const name of ['Class 6', 'Class 7']) {
      const std = stdByName[name];
      const g = groups.find((x) => String(x.standardId) === String(std?._id) && x.name === 'A');
      if (g && teacherUser) assignments.push({ group: g, user: teacherUser });
    }
    for (const a of assignments) {
      await M('AcademicGroup').updateOne({ _id: a.group._id }, { $set: { inchargeId: a.user._id } });
    }
    note('section in-charges', assignments.length);
  }

  // ── Departments ────────────────────────────────────────────────────────────
  await fill('Department', 'departments', async () => [
    'Science', 'Mathematics', 'Languages', 'Social Science', 'Computer Science',
    'Physical Education', 'Administration', 'Accounts',
  ].map((name) => ({ tenantId, branchId, name })));

  // ── Staff ──────────────────────────────────────────────────────────────────
  const DESIGNATIONS = [
    ['Principal', 'Administration'], ['Vice Principal', 'Administration'],
    ['PGT Mathematics', 'Mathematics'], ['PGT Physics', 'Science'], ['PGT Chemistry', 'Science'],
    ['TGT English', 'Languages'], ['TGT Hindi', 'Languages'], ['TGT Gujarati', 'Languages'],
    ['TGT Social Science', 'Social Science'], ['PRT', 'Administration'],
    ['Computer Instructor', 'Computer Science'], ['PT Instructor', 'Physical Education'],
    ['Accountant', 'Accounts'], ['Head Clerk', 'Administration'], ['Librarian', 'Administration'],
    ['Lab Assistant', 'Science'], ['Receptionist', 'Administration'], ['Driver', 'Administration'],
  ];
  const staff = await fill('Staff', 'staff', async () => {
    const out = [];
    for (let i = 0; i < 24; i++) {
      const [designation, department] = DESIGNATIONS[i % DESIGNATIONS.length];
      const gender = rnd() > 0.45 ? 'female' : 'male';
      out.push({
        tenantId,
        branchId,
        employeeId: `EMP${pad(i + 1, 3)}`,
        name: personName(gender),
        gender,
        dob: new Date(1980 + int(0, 15), int(0, 11), int(1, 28)),
        designation,
        department,
        qualification: [{
          degree: pick(['B.Ed', 'M.Ed', 'M.Sc', 'M.A', 'B.Com', 'MCA']),
          institution: pick(['VNSGU Surat', 'Gujarat University', 'MS University Baroda']),
          year: int(2004, 2018),
          percentage: int(58, 88),
        }],
        experience: [{
          school: pick(['Little Angels School', 'St. Xavier’s High School', 'Nav Jeevan Vidyalaya']),
          from: new Date(2012, 5, 1),
          to: new Date(2016, 3, 30),
          role: 'Teacher',
        }],
        joiningDate: new Date(2016 + int(0, 9), int(0, 11), int(1, 28)),
        phone: `98${int(10000000, 99999999)}`,
        email: `emp${pad(i + 1, 3)}@${SLUG}.school`,
        pan: `ABCDE${int(1000, 9999)}F`,
        bankAccount: { number: `${int(10000000, 99999999)}${int(1000, 9999)}`, ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
        city: 'Surat',
        state: 'Gujarat',
        pinCode: '395010',
        isActive: true,
      });
    }
    return out;
  });
  const allStaff = staff ?? (await M('Staff').find({ tenantId }).limit(24));

  // ── Students + enrolments ──────────────────────────────────────────────────
  // 12 per section across every class — enough for class lists, mark sheets and
  // attendance registers to look real without a 500-row seed.
  console.log('\nStudents');
  const PER_SECTION = 12;
  let admissionCounter = 0;
  const students = await fill('Student', 'students', async () => {
    const out = [];
    for (const g of groups) {
      const std = standards.find((s) => String(s._id) === String(g.standardId));
      if (!std) continue;
      for (let i = 1; i <= PER_SECTION; i++) {
        admissionCounter += 1;
        const gender = rnd() > 0.48 ? 'female' : 'male';
        const name = personName(gender);
        const surname = name.split(' ')[1];
        const category = pick(CATEGORIES);
        out.push({
          tenantId,
          branchId,
          admissionNo: `ADM${year.name.slice(0, 4)}${pad(admissionCounter)}`,
          grNo: `GR${pad(admissionCounter, 5)}`,
          rollNo: String(i),
          name,
          gender,
          dob: new Date(2026 - (std.order + 5), int(0, 11), int(1, 28)),
          bloodGroup: pick(BLOOD),
          category,
          isRteStudent: category === 'ews' && rnd() > 0.5,
          religion: pick(['Hindu', 'Hindu', 'Hindu', 'Muslim', 'Jain', 'Christian']),
          motherTongue: pick(['Gujarati', 'Hindi', 'Marathi', 'English']),
          nationality: 'Indian',
          standardId: std._id,
          divisionName: g.name,
          academicGroupId: g._id,
          academicYearId,
          admissionDate: new Date('2026-04-05'),
          house: pick(['Red', 'Blue', 'Green', 'Yellow']),
          addresses: [{ type: 'current', line1: `${int(1, 200)}, ${pick(['Shanti', 'Gokul', 'Anand', 'Vrundavan'])} Society`, city: 'Surat', state: 'Gujarat', pinCode: '395010' }],
          guardians: [
            { relation: 'father', name: `${pick(FIRST_M)} ${surname}`, phone: `98${int(10000000, 99999999)}`, email: `parent.${admissionCounter}@example.com`, occupation: pick(['Business', 'Service', 'Doctor', 'Engineer', 'Farmer']), annualIncome: int(2, 18) * 100000 * RUPEE, isPrimary: true },
            { relation: 'mother', name: `${pick(FIRST_F)} ${surname}`, phone: `97${int(10000000, 99999999)}`, occupation: pick(['Homemaker', 'Teacher', 'Service']) },
          ],
          transport: { isAvailing: rnd() > 0.7 },
          hostel: { isResident: std.order >= 11 && rnd() > 0.85 },
          status: 'active',
        });
      }
    }
    return out;
  });
  const allStudents = students ?? (await M('Student').find({ tenantId, deletedAt: null }));

  await fill('Enrolment', 'enrolments', async () => allStudents.map((s) => ({
    tenantId,
    branchId,
    academicYearId,
    studentId: s._id,
    academicGroupId: s.academicGroupId,
    standardId: s.standardId,
    divisionName: s.divisionName,
    rollNo: s.rollNo,
    status: 'active',
    joinedAt: new Date('2026-04-05'),
  })));

  // ── Fees ───────────────────────────────────────────────────────────────────
  // Heads carry the GST treatment (spec §10.5: tuition exempt, transport/hostel taxable).
  console.log('\nFees');
  const heads = await fill('FeeHead', 'fee heads', async () => [
    ['Tuition Fee', 'TUITION', 'tuition', 0],
    ['Admission Fee', 'ADMISSION', 'admission', 0],
    ['Development Fee', 'DEVELOP', 'other', 0],
    ['Activity Fee', 'ACTIVITY', 'activity', 0],
    ['Computer Lab Fee', 'COMPUTER', 'other', 0],
    ['Library Fee', 'LIBRARY', 'other', 0],
    ['Sports Fee', 'SPORTS', 'activity', 0],
    ['Exam Fee', 'EXAM', 'exam', 0],
    ['Transport Fee', 'TRANSPORT', 'transport', 5],
    ['Hostel Fee', 'HOSTEL', 'hostel', 5],
    ['Mess Fee', 'MESS', 'mess', 5],
    ['Uniform', 'UNIFORM', 'uniform', 5],
    ['Caution Deposit', 'DEPOSIT', 'deposit', 0],
    ['Late Fee Fine', 'LATEFINE', 'fine', 0],
  ].map(([name, code, category, gstRate], i) => ({
    tenantId, branchId, name, code, category, gstRate,
    hsnSac: gstRate > 0 ? '9992' : undefined,
    isDeposit: code === 'DEPOSIT',
    isRefundable: code === 'DEPOSIT',
    concessionAllowed: code !== 'DEPOSIT',
    sortOrder: i,
  })));
  const allHeads = heads ?? (await M('FeeHead').find({ tenantId }));
  const head = (code) => allHeads.find((h) => h.code === code);

  // One structure per class, scaled by stage. Amounts in paise.
  const structures = await fill('FeeStructure', 'fee structures', async () => standards.map((std) => {
    const base = { pre_primary: 18000, primary: 24000, middle: 30000, secondary: 38000, senior_secondary: 46000 }[std.stage] ?? 24000;
    const components = [
      { headCode: 'TUITION', amount: base },
      { headCode: 'DEVELOP', amount: Math.round(base * 0.22) },
      { headCode: 'ACTIVITY', amount: Math.round(base * 0.15) },
      { headCode: 'COMPUTER', amount: Math.round(base * 0.08), isOptional: true },
      { headCode: 'LIBRARY', amount: 1200 },
      { headCode: 'SPORTS', amount: 1800 },
      { headCode: 'EXAM', amount: 1500 },
    ].map((c) => {
      const h = head(c.headCode);
      return {
        feeHeadId: h._id,
        name: h.name,
        amount: c.amount * RUPEE,
        gstRate: h.gstRate,
        isOptional: Boolean(c.isOptional),
      };
    });
    return {
      tenantId,
      branchId,
      academicYearId,
      name: `${std.name} — Fee Structure ${year.name}`,
      standardId: std._id,
      category: 'all',
      schedule: 'annual_installments',
      components,
      installments: [
        { name: 'Term 1', dueDate: new Date('2026-04-15'), percentage: 50 },
        { name: 'Term 2', dueDate: new Date('2026-10-15'), percentage: 50 },
      ],
      lateFee: { enabled: true, mode: 'per_day', amount: 20 * RUPEE, graceDays: 7, maxAmount: 2000 * RUPEE },
      isActive: true,
    };
  }));
  const allStructures = structures ?? (await M('FeeStructure').find({ tenantId }));
  const structFor = (standardId) => allStructures.find((s) => String(s.standardId) === String(standardId));

  // Demands: both instalments per student. Term 1 is mostly settled, Term 2 mostly open —
  // so the collection report, the defaulter list and the receipt screen all have rows.
  const demands = await fill('FeeDemand', 'fee demands', async () => {
    const out = [];
    let n = 0;
    for (const s of allStudents) {
      const st = structFor(s.standardId);
      if (!st) continue;
      for (const inst of st.installments) {
        n += 1;
        const share = (inst.percentage ?? 50) / 100;
        const components = st.components
          .filter((c) => !c.isOptional)
          .map((c) => {
            const amount = Math.round(c.amount * share);
            const gst = Math.round((amount * (c.gstRate || 0)) / 100);
            return { feeHeadId: c.feeHeadId, name: c.name, amount, concession: 0, gstRate: c.gstRate, gst, paid: 0, due: amount + gst };
          });
        const grossAmount = components.reduce((a, c) => a + c.amount, 0);
        const gstAmount = components.reduce((a, c) => a + c.gst, 0);
        const totalAmount = grossAmount + gstAmount;
        out.push({
          tenantId,
          branchId,
          academicYearId,
          studentId: s._id,
          feeStructureId: st._id,
          demandNo: `DMD${year.name.slice(0, 4)}${pad(n, 6)}`,
          period: inst.name,
          installmentName: inst.name,
          dueDate: inst.dueDate,
          components,
          grossAmount,
          concessionAmount: 0,
          gstAmount,
          lateFee: 0,
          totalAmount,
          totalPaid: 0,
          totalDue: totalAmount,
          status: 'pending',
          generationKey: `${s._id}:${st._id}:${inst.name}`,
        });
      }
    }
    return out;
  });

  // Payments settle Term 1 for ~80% of students; the rest stay outstanding.
  if (demands) {
    const term1 = demands.filter((d) => d.period === 'Term 1');
    const payments = [];
    const demandUpdates = [];
    let receipt = 0;
    for (const d of term1) {
      if (rnd() > 0.8) continue; // 20% defaulters
      receipt += 1;
      const full = rnd() > 0.25;
      const amount = full ? d.totalAmount : Math.round(d.totalAmount / 2);
      payments.push({
        tenantId,
        branchId,
        academicYearId,
        receiptNo: `RCP${year.name.slice(0, 4)}${pad(receipt, 6)}`,
        studentId: d.studentId,
        amount,
        allocations: [{ demandId: d._id, amount }],
        method: pick(['cash', 'upi', 'upi', 'neft', 'cheque', 'card']),
        status: 'success',
        collectedBy: accountant?._id,
        paidAt: new Date(2026, 3, int(6, 28)),
      });
      demandUpdates.push({
        updateOne: {
          filter: { _id: d._id },
          update: {
            $set: {
              totalPaid: amount,
              totalDue: d.totalAmount - amount,
              status: full ? 'paid' : 'partial',
            },
          },
        },
      });
    }
    await M('FeePayment').insertMany(payments);
    if (demandUpdates.length) await M('FeeDemand').bulkWrite(demandUpdates);
    note('fee payments', payments.length);
  }

  await fill('Concession', 'concessions', async () => allStudents
    .filter((s) => s.isRteStudent || s.category === 'ews')
    .slice(0, 20)
    .map((s, i) => ({
      tenantId,
      branchId,
      academicYearId,
      studentId: s._id,
      type: s.isRteStudent ? 'rte' : 'need_based',
      isPercentage: true,
      value: s.isRteStudent ? 100 : 25,
      reason: s.isRteStudent ? 'RTE 25% quota admission' : 'Economically weaker section',
      requiresApproval: true,
      status: i % 3 === 0 ? 'pending' : 'approved',
      approvedBy: i % 3 === 0 ? undefined : principal?._id,
      approvedAt: i % 3 === 0 ? undefined : new Date('2026-04-20'),
      validFrom: new Date('2026-04-01'),
    })));

  // ── Attendance ─────────────────────────────────────────────────────────────
  // Last 20 working days for every section.
  console.log('\nAttendance');
  await fill('Attendance', 'attendance days', async () => {
    const out = [];
    const studentsByGroup = new Map();
    for (const s of allStudents) {
      const k = String(s.academicGroupId);
      if (!studentsByGroup.has(k)) studentsByGroup.set(k, []);
      studentsByGroup.get(k).push(s);
    }
    // Local midnight, not UTC. `attendance.service.js#startOfDay` normalises with
    // `setHours(0,0,0,0)`, so a register written through the API lands on the server's
    // local midnight — seeding UTC midnight instead produces rows the register lookup
    // can never find.
    const today = new Date(2026, 7, 17);
    const days = [];
    for (let back = 1; days.length < 20; back++) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      if (d.getDay() !== 0) days.push(new Date(d)); // skip Sundays
    }
    for (const g of groups) {
      const roster = studentsByGroup.get(String(g._id)) ?? [];
      if (!roster.length) continue;
      for (const date of days) {
        const records = roster.map((s) => {
          const r = rnd();
          const status = r > 0.93 ? 'absent' : r > 0.89 ? 'late' : r > 0.87 ? 'leave' : 'present';
          return { studentId: s._id, status, source: 'manual' };
        });
        const count = (st) => records.filter((r) => r.status === st).length;
        out.push({
          tenantId,
          branchId,
          academicYearId,
          academicGroupId: g._id,
          standardId: g.standardId,
          divisionName: g.name,
          date,
          session: 'full_day',
          records,
          summary: {
            total: records.length,
            present: count('present'),
            absent: count('absent'),
            late: count('late'),
            leave: count('leave'),
          },
          markedBy: ct8a?._id ?? teacherUser?._id,
          markedAt: date,
        });
      }
    }
    return out;
  });

  // ── Exams, grade scheme, marks ─────────────────────────────────────────────
  console.log('\nExams');
  const schemes = await fill('GradeScheme', 'grade schemes', async () => [{
    tenantId,
    branchId,
    name: 'CBSE Scholastic Grades',
    board: 'CBSE',
    isDefault: true,
    passPercent: 33,
    absentGrade: 'AB',
    bands: [
      { grade: 'A1', minPercent: 91, maxPercent: 100, gradePoint: 10, description: 'Outstanding' },
      { grade: 'A2', minPercent: 81, maxPercent: 90, gradePoint: 9, description: 'Excellent' },
      { grade: 'B1', minPercent: 71, maxPercent: 80, gradePoint: 8, description: 'Very Good' },
      { grade: 'B2', minPercent: 61, maxPercent: 70, gradePoint: 7, description: 'Good' },
      { grade: 'C1', minPercent: 51, maxPercent: 60, gradePoint: 6, description: 'Fair' },
      { grade: 'C2', minPercent: 41, maxPercent: 50, gradePoint: 5, description: 'Average' },
      { grade: 'D', minPercent: 33, maxPercent: 40, gradePoint: 4, description: 'Pass' },
      { grade: 'E', minPercent: 0, maxPercent: 32, gradePoint: 0, description: 'Needs Improvement' },
    ],
  }]);
  const scheme = (schemes && schemes[0]) ?? (await M('GradeScheme').findOne({ tenantId }));

  const coreSubjectNames = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science'];
  const coreSubjects = coreSubjectNames.map((n) => subjByName[n]).filter(Boolean);

  const exams = await fill('Exam', 'exams', async () => [
    {
      name: 'Unit Test 1', type: 'unit_test', status: 'published',
      startDate: new Date('2026-07-06'), endDate: new Date('2026-07-10'),
      publishedAt: new Date('2026-07-20'), publishedBy: principal?._id,
    },
    {
      name: 'Half Yearly Examination', type: 'half_yearly', status: 'marks_entry',
      startDate: new Date('2026-09-14'), endDate: new Date('2026-09-25'),
    },
    {
      name: 'Annual Examination', type: 'annual', status: 'draft',
      startDate: new Date('2027-02-20'), endDate: new Date('2027-03-10'),
    },
  ].map((e) => ({
    tenantId,
    branchId,
    academicYearId,
    gradeSchemeId: scheme?._id,
    academicGroupIds: groups.map((g) => g._id),
    subjectIds: coreSubjects.map((s) => s._id),
    schedule: coreSubjects.map((s, i) => {
      const d = new Date(e.startDate);
      d.setDate(d.getDate() + i);
      return { subjectId: s._id, date: d, startTime: '09:00', endTime: '12:00', maxMarks: 100, passMarks: 33, room: 'Exam Hall' };
    }),
    showRank: true,
    isActive: true,
    ...e,
  })));

  // Marks for the published exam only — an exam still in draft with marks in it would be
  // a state the exam workflow is supposed to prevent.
  const publishedExam = (exams ?? await M('Exam').find({ tenantId })).find((e) => e.status === 'published');
  if (publishedExam) {
    const existing = await M('MarksEntry').countDocuments({ tenantId });
    if (existing > 0) {
      note('marks entries', `${existing} (kept)`);
    } else {
      const rows = [];
      const gradeFor = (pct) => scheme.bands.find((b) => pct >= b.minPercent && pct <= b.maxPercent);
      // Secondary classes only — 5 subjects × ~120 students keeps the seed quick.
      const target = allStudents.filter((s) => {
        const std = standards.find((x) => String(x._id) === String(s.standardId));
        return std && std.order >= 11;
      });
      for (const s of target) {
        for (const subj of coreSubjects) {
          const isAbsent = rnd() > 0.97;
          const marks = isAbsent ? undefined : int(28, 99);
          const g = isAbsent ? null : gradeFor(marks);
          rows.push({
            tenantId,
            branchId,
            examId: publishedExam._id,
            studentId: s._id,
            subjectId: subj._id,
            academicGroupId: s.academicGroupId,
            standardId: s.standardId,
            divisionName: s.divisionName,
            marksObtained: marks,
            maxMarks: 100,
            passMarks: 33,
            grade: isAbsent ? scheme.absentGrade : g?.grade,
            gradePoint: g?.gradePoint,
            isAbsent,
            lockState: 'locked',
            enteredBy: teacherUser?._id,
          });
        }
      }
      await M('MarksEntry').insertMany(rows);
      note('marks entries', rows.length);
    }
  }

  // ── Timetable, homework, study material, syllabus ──────────────────────────
  console.log('\nAcademics');
  const teachingSubjects = subjects.filter((s) => s.type !== 'co_scholastic');
  await fill('Timetable', 'timetables', async () => groups.map((g) => {
    const std = standards.find((x) => String(x._id) === String(g.standardId));
    const slots = [];
    for (let day = 0; day < 6; day++) {
      for (let p = 1; p <= 8; p++) {
        if (p === 5) {
          slots.push({ dayOfWeek: day, periodNo: p, startTime: '12:00', endTime: '12:40', type: 'lunch' });
          continue;
        }
        const subj = teachingSubjects[(day * 8 + p) % teachingSubjects.length];
        const startHour = 8 + (p <= 4 ? p - 1 : p - 1);
        slots.push({
          dayOfWeek: day,
          periodNo: p,
          startTime: `${pad(startHour, 2)}:00`,
          endTime: `${pad(startHour, 2)}:40`,
          type: 'subject',
          subjectId: subj._id,
          teacherId: teacherUser?._id,
          room: `${std?.shortName ?? ''}-${g.name}`,
        });
      }
    }
    return {
      tenantId, branchId, academicYearId,
      standardId: g.standardId, divisionName: g.name, academicGroupId: g._id,
      isActive: true, slots,
    };
  }));

  await fill('Homework', 'homework', async () => {
    const out = [];
    for (const g of groups.slice(0, 16)) {
      for (const subj of coreSubjects.slice(0, 3)) {
        out.push({
          tenantId,
          branchId,
          standardId: g.standardId,
          divisionName: g.name,
          academicGroupId: g._id,
          subjectId: subj._id,
          teacherId: teacherUser?._id,
          title: `${subj.name} — worksheet`,
          description: `Complete the exercises from the ${subj.name} workbook and submit by the due date.`,
          type: 'homework',
          dueDate: new Date('2026-08-19'),
          isActive: true,
        });
      }
    }
    return out;
  });

  await fill('StudyMaterial', 'study material', async () => {
    const out = [];
    for (const std of standards.slice(3)) {
      for (const subj of coreSubjects.slice(0, 2)) {
        out.push({
          tenantId, branchId,
          title: `${std.name} ${subj.name} — chapter notes`,
          description: 'Consolidated chapter notes shared by the subject teacher.',
          standardId: std._id,
          subjectId: subj._id,
          type: 'notes',
          uploadedBy: teacherUser?._id,
        });
      }
    }
    return out;
  });

  await fill('Syllabus', 'syllabus', async () => {
    const out = [];
    for (const std of standards.slice(3)) {
      for (const subj of coreSubjects) {
        out.push({
          tenantId, branchId, academicYearId,
          standardId: std._id,
          subjectId: subj._id,
          teacherId: teacherUser?._id,
          chapters: [
            { no: 1, title: `${subj.name} — Chapter 1`, topics: ['Introduction', 'Core concepts'], status: 'completed', completedDate: new Date('2026-06-20') },
            { no: 2, title: `${subj.name} — Chapter 2`, topics: ['Applications', 'Exercises'], status: 'completed', completedDate: new Date('2026-07-25') },
            { no: 3, title: `${subj.name} — Chapter 3`, topics: ['Advanced topics'], status: 'in_progress' },
            { no: 4, title: `${subj.name} — Chapter 4`, topics: ['Revision'], status: 'pending' },
          ],
        });
      }
    }
    return out;
  });

  // ── Library ────────────────────────────────────────────────────────────────
  console.log('\nLibrary / transport / hostel / stores');
  const books = await fill('Book', 'books', async () => {
    const titles = [
      ['NCERT Mathematics Class 10', 'NCERT', 'textbook'], ['NCERT Science Class 10', 'NCERT', 'textbook'],
      ['Wings of Fire', 'A.P.J. Abdul Kalam', 'reference'], ['The Discovery of India', 'Jawaharlal Nehru', 'reference'],
      ['Malgudi Days', 'R.K. Narayan', 'story'], ['Panchatantra Tales', 'Vishnu Sharma', 'story'],
      ['Oxford English Dictionary', 'Oxford', 'reference'], ['Britannica Encyclopedia', 'Britannica', 'encyclopedia'],
      ['Gujarati Vyakaran', 'Navneet', 'textbook'], ['Physics Part I Class 12', 'NCERT', 'textbook'],
      ['Chemistry Part I Class 12', 'NCERT', 'textbook'], ['Indian Constitution — An Introduction', 'D.D. Basu', 'reference'],
      ['Competition Success Review', 'CSR', 'magazine'], ['Science Reporter', 'CSIR', 'journal'],
      ['Harry Potter and the Philosopher’s Stone', 'J.K. Rowling', 'fiction'],
      ['The Jungle Book', 'Rudyard Kipling', 'fiction'],
    ];
    return titles.map(([title, author, category], i) => {
      const total = int(3, 12);
      return {
        tenantId, branchId, title, author, category,
        isbn: `978${int(1000000000, 9999999999)}`,
        publisher: pick(['NCERT', 'Navneet', 'Oxford', 'Penguin', 'S. Chand']),
        totalCopies: total,
        availableCopies: total,
        barcode: `BK${pad(i + 1, 5)}`,
        rackNo: `R${int(1, 12)}`,
        purchaseDate: new Date(2024, int(0, 11), int(1, 28)),
        purchasePrice: int(150, 900) * RUPEE,
        isActive: true,
      };
    });
  });
  const allBooks = books ?? (await M('Book').find({ tenantId }));

  if (allBooks.length) {
    const existing = await M('BookIssue').countDocuments({ tenantId });
    if (existing > 0) {
      note('book issues', `${existing} (kept)`);
    } else {
      const issues = [];
      const decrement = new Map();
      for (let i = 0; i < 40; i++) {
        const book = pick(allBooks);
        const student = pick(allStudents);
        const issueDate = new Date(2026, 6, int(1, 28));
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 14);
        const returned = rnd() > 0.45;
        const overdue = !returned && dueDate < new Date('2026-08-17');
        issues.push({
          tenantId,
          bookId: book._id,
          memberId: student._id,
          memberType: 'student',
          issueDate,
          dueDate,
          returnDate: returned ? new Date(dueDate.getTime() - int(0, 5) * 86400000) : undefined,
          status: returned ? 'returned' : overdue ? 'overdue' : 'issued',
          fineAmount: overdue ? int(1, 30) * 2 * RUPEE : 0,
          issuedBy: librarian?._id,
        });
        if (!returned) decrement.set(String(book._id), (decrement.get(String(book._id)) ?? 0) + 1);
      }
      await M('BookIssue').insertMany(issues);
      await M('Book').bulkWrite([...decrement].map(([id, n]) => ({
        updateOne: { filter: { _id: id }, update: { $inc: { availableCopies: -n } } },
      })));
      note('book issues', issues.length);
    }
  }

  // ── Transport ──────────────────────────────────────────────────────────────
  const vehicles = await fill('Vehicle', 'vehicles', async () => [
    'GJ05AB1234', 'GJ05AB5678', 'GJ05CD9012', 'GJ05EF3456', 'GJ05GH7890',
  ].map((number, i) => ({
    tenantId, branchId, number,
    type: i === 4 ? 'van' : 'bus',
    capacity: i === 4 ? 15 : 45,
    insuranceExpiry: new Date('2027-03-31'),
    pucExpiry: new Date('2026-12-31'),
    fitnessExpiry: new Date('2027-06-30'),
    roadTaxExpiry: new Date('2027-03-31'),
    isActive: true,
  })));
  const allVehicles = vehicles ?? (await M('Vehicle').find({ tenantId }));

  await fill('Route', 'transport routes', async () => [
    ['Route 1 — Adajan', ['Adajan Gam', 'Palanpur Patiya', 'Rander Road', 'Pal RTO']],
    ['Route 2 — Vesu', ['Vesu Circle', 'VIP Road', 'Bhimrad', 'Althan']],
    ['Route 3 — Katargam', ['Katargam Darwaja', 'Singanpor', 'Ved Road', 'Amroli']],
    ['Route 4 — Varachha', ['Varachha Circle', 'Sarthana', 'Mota Varachha', 'Kapodra']],
    ['Route 5 — City', ['Chowk Bazaar', 'Athwalines', 'Ghod Dod Road', 'Piplod']],
  ].map(([name, stops], i) => ({
    tenantId, branchId,
    vehicleId: allVehicles[i % allVehicles.length]?._id,
    name,
    code: `R${i + 1}`,
    stops: stops.map((s, j) => ({
      name: s,
      sequence: j + 1,
      pickupTime: `0${7 + Math.floor(j / 3)}:${pad(15 + j * 10, 2)}`,
      dropTime: `1${5 + Math.floor(j / 3)}:${pad(10 + j * 10, 2)}`,
      distance: (j + 1) * 3,
      fee: (800 + j * 100) * RUPEE,
    })),
    isActive: true,
  })));

  // ── Hostel ─────────────────────────────────────────────────────────────────
  const rooms = await fill('HostelRoom', 'hostel rooms', async () => {
    const out = [];
    for (const [block, gender] of [['Boys Block', 'boys'], ['Girls Block', 'girls']]) {
      for (let floor = 1; floor <= 2; floor++) {
        for (let r = 1; r <= 8; r++) {
          out.push({
            tenantId, branchId, block, floor: `Floor ${floor}`,
            roomNo: `${gender === 'boys' ? 'B' : 'G'}${floor}${pad(r, 2)}`,
            type: r % 4 === 0 ? 'triple' : 'double',
            capacity: r % 4 === 0 ? 3 : 2,
            occupancy: 0,
            gender,
            isActive: true,
          });
        }
      }
    }
    return out;
  });
  const allRooms = rooms ?? (await M('HostelRoom').find({ tenantId }));

  if (allRooms.length) {
    const existing = await M('HostelAllocation').countDocuments({ tenantId });
    if (existing > 0) {
      note('hostel allocations', `${existing} (kept)`);
    } else {
      const residents = allStudents.filter((s) => s.hostel?.isResident).slice(0, 30);
      const allocations = [];
      const occ = new Map();
      for (const s of residents) {
        const pool = allRooms.filter((r) => r.gender === (s.gender === 'female' ? 'girls' : 'boys')
          && (occ.get(String(r._id)) ?? 0) < r.capacity);
        if (!pool.length) continue;
        const room = pool[0];
        const n = (occ.get(String(room._id)) ?? 0) + 1;
        occ.set(String(room._id), n);
        allocations.push({
          tenantId, studentId: s._id, roomId: room._id, bedNo: String(n),
          from: new Date('2026-04-10'), status: 'active', academicYearId,
        });
      }
      await M('HostelAllocation').insertMany(allocations);
      await M('HostelRoom').bulkWrite([...occ].map(([id, n]) => ({
        updateOne: { filter: { _id: id }, update: { $set: { occupancy: n } } },
      })));
      note('hostel allocations', allocations.length);
    }
  }

  // ── Inventory & expenses ───────────────────────────────────────────────────
  await fill('Inventory', 'inventory items', async () => [
    ['Student Desk', 'furniture', 420, 350], ['Teacher Chair', 'furniture', 60, 55],
    ['Whiteboard', 'furniture', 40, 38], ['Desktop Computer', 'electronics', 45, 41],
    ['Projector', 'electronics', 12, 10], ['LED TV 55"', 'electronics', 8, 8],
    ['A4 Paper Ream', 'stationery', 200, 96], ['Marker Pen (box)', 'stationery', 150, 72],
    ['Cricket Kit', 'sports', 6, 5], ['Football', 'sports', 20, 14],
    ['Microscope', 'lab', 25, 23], ['Chemistry Glassware Set', 'lab', 30, 26],
    ['Library Rack', 'library', 24, 24], ['Broom', 'housekeeping', 40, 22],
    ['School Uniform Set', 'uniform', 300, 180],
  ].map(([name, category, quantity, available], i) => ({
    tenantId, branchId, name, category,
    itemCode: `INV${pad(i + 1, 4)}`,
    totalQuantity: quantity,
    availableQuantity: available,
    issuedQuantity: quantity - available,
    unit: 'nos',
    purchasePrice: int(200, 25000) * RUPEE,
    minStock: Math.round(quantity * 0.15),
    vendor: pick(['Shreeji Enterprise', 'Patel Traders', 'Surat Furniture Mart']),
    location: 'Main Store',
    lastPurchasedAt: new Date(2026, int(0, 6), int(1, 28)),
    isActive: true,
  })));

  await fill('Expense', 'expenses', async () => {
    const out = [];
    const items = [
      ['Electricity bill — July', 'utilities', 84500],
      ['Water charges — July', 'utilities', 12400],
      ['Bus diesel — July', 'travel', 165000],
      ['Classroom repainting — Block A', 'maintenance', 240000],
      ['Stationery purchase — Q2', 'stationery', 58000],
      ['Annual Day stage setup', 'events', 320000],
      ['Lab equipment servicing', 'repairs', 46500],
      ['Newspaper advertisement — admissions', 'marketing', 180000],
      ['Housekeeping contract — July', 'maintenance', 96000],
      ['Internet leased line — July', 'utilities', 22000],
      ['Generator servicing', 'repairs', 18500],
      ['Sports equipment purchase', 'other', 74000],
    ];
    items.forEach(([title, category, rupees], i) => {
      const status = i % 4 === 0 ? 'pending' : i % 4 === 1 ? 'approved' : 'paid';
      const billDate = new Date(2026, 6, int(1, 28));
      out.push({
        tenantId, branchId, title, category,
        amount: rupees * RUPEE,
        billNo: `BILL/${pad(i + 1, 4)}`,
        billDate,
        paymentMethod: pick(['neft', 'cheque', 'upi', 'cash']),
        paidAt: status === 'paid' ? new Date(billDate.getTime() + 5 * 86400000) : undefined,
        vendor: pick(['Shreeji Enterprise', 'Torrent Power', 'Surat Municipal Corp', 'Patel Traders']),
        status,
        approvedBy: status === 'pending' ? undefined : principal?._id,
        createdBy: accountant?._id,
      });
    });
    return out;
  });

  // ── Front office ───────────────────────────────────────────────────────────
  console.log('\nFront office / HR / communication');
  await fill('Visitor', 'visitors', async () => {
    const out = [];
    for (let i = 0; i < 25; i++) {
      const checkIn = new Date(2026, 7, int(1, 16), int(9, 16), int(0, 59));
      const checkOut = rnd() > 0.3 ? new Date(checkIn.getTime() + int(15, 90) * 60000) : undefined;
      out.push({
        tenantId, branchId,
        name: personName(rnd() > 0.5 ? 'male' : 'female'),
        phone: `98${int(10000000, 99999999)}`,
        purpose: pick(['Meet class teacher', 'Fee payment', 'Admission enquiry', 'Meet Principal', 'Document submission', 'Vendor delivery']),
        toMeet: pick(['Principal', 'Class Teacher', 'Accounts', 'Reception']),
        idProofType: 'aadhaar',
        idProofNo: `XXXX XXXX ${int(1000, 9999)}`,
        checkIn,
        checkOut,
        otpVerified: true,
        gatePassNo: `VP${pad(i + 1, 4)}`,
        createdBy: byEmail('reception')?._id,
      });
    }
    return out;
  });

  await fill('Enquiry', 'admission enquiries', async () => {
    const out = [];
    const statuses = ['new', 'contacted', 'school_visit', 'form_issued', 'form_submitted', 'admitted', 'lost'];
    for (let i = 0; i < 30; i++) {
      const gender = rnd() > 0.5 ? 'male' : 'female';
      const std = pick(standards);
      out.push({
        tenantId, branchId,
        studentName: personName(gender),
        gender,
        dob: new Date(2026 - (std.order + 5), int(0, 11), int(1, 28)),
        applyingForStandard: std._id,
        applyingForDivision: pick(['A', 'B']),
        applyingForYear: year.name,
        currentSchool: pick(['Little Angels School', 'St. Xavier’s', 'Nav Jeevan Vidyalaya', '']),
        parentName: personName('male'),
        parentPhone: `98${int(10000000, 99999999)}`,
        parentEmail: `enquiry${i + 1}@example.com`,
        source: pick(['walk_in', 'website', 'reference', 'newspaper', 'justdial', 'google_ad']),
        status: statuses[i % statuses.length],
        assignedTo: byEmail('reception')?._id,
        followUpDate: new Date(2026, 7, int(18, 30)),
        notes: 'Parent enquired about fee structure and transport availability.',
      });
    }
    return out;
  });

  await fill('Certificate', 'certificates', async () => allStudents.slice(0, 12).map((s, i) => ({
    tenantId, branchId,
    studentId: s._id,
    type: pick(['bonafide', 'character', 'study', 'conduct']),
    serialNo: `CERT/${year.name}/${pad(i + 1, 4)}`,
    issuedAt: new Date(2026, 7, int(1, 16)),
    issuedBy: principal?._id,
    verificationCode: `VC${pad(i + 1, 6)}`,
    remarks: pick(['Passport application', 'Bank account opening', 'Scholarship application', 'Address proof']),
  })));

  await fill('DisciplineRecord', 'discipline records', async () => allStudents.slice(20, 38).map((s, i) => ({
    tenantId,
    studentId: s._id,
    type: i % 3 === 0 ? 'merit' : 'demerit',
    title: i % 3 === 0 ? 'Excellent conduct during assembly' : 'Late to class repeatedly',
    description: i % 3 === 0 ? 'Recognised by the class teacher for helping a junior student.' : 'Reported by the subject teacher; parent informed.',
    points: i % 3 === 0 ? 5 : -3,
    date: new Date(2026, 7, int(1, 16)),
    recordedBy: teacherUser?._id,
  })));

  await fill('HealthRecord', 'health records', async () => allStudents.slice(0, 40).map((s) => {
    const height = int(110, 178);
    const weight = int(20, 72);
    return {
      tenantId,
      studentId: s._id,
      type: 'checkup',
      date: new Date(2026, 5, int(1, 28)),
      height,
      weight,
      bmi: Math.round((weight / ((height / 100) ** 2)) * 10) / 10,
      visionLeft: '6/6',
      visionRight: pick(['6/6', '6/9', '6/12']),
      bloodPressure: '110/70',
      doctorName: 'Dr. Hetal Shah',
      nextCheckupDate: new Date(2027, 5, 15),
      notes: 'Annual health check-up — no abnormality detected.',
      recordedBy: principal?._id,
    };
  }));

  await fill('Alumni', 'alumni', async () => {
    const out = [];
    for (let i = 0; i < 20; i++) {
      const gender = rnd() > 0.5 ? 'male' : 'female';
      out.push({
        tenantId,
        name: personName(gender),
        batch: String(2015 + (i % 10)),
        lastClass: 'Class 12',
        email: `alumni${i + 1}@example.com`,
        phone: `99${int(10000000, 99999999)}`,
        occupation: pick(['Software Engineer', 'Doctor', 'CA', 'Entrepreneur', 'Teacher', 'Civil Services']),
        city: pick(['Surat', 'Ahmedabad', 'Mumbai', 'Bengaluru', 'Pune']),
        notes: `Higher education: ${pick(['B.Tech', 'MBBS', 'B.Com', 'BBA', 'B.Sc'])}`,
      });
    }
    return out;
  });

  // ── HR ─────────────────────────────────────────────────────────────────────
  await fill('Leave', 'leave requests', async () => allStaff.slice(0, 14).map((st, i) => {
    const from = new Date(2026, 7, int(1, 20));
    const to = new Date(from);
    to.setDate(to.getDate() + int(0, 3));
    const status = ['pending', 'approved', 'approved', 'rejected'][i % 4];
    return {
      tenantId,
      staffId: st._id,
      type: pick(['cl', 'sl', 'el', 'comp_off']),
      from,
      to,
      reason: pick(['Medical', 'Family function', 'Personal work', 'Out of station']),
      status,
      appliedAt: new Date(from.getTime() - 3 * 86400000),
      approvedBy: status === 'pending' ? undefined : principal?._id,
      approvedAt: status === 'pending' ? undefined : new Date(from.getTime() - 86400000),
      rejectionReason: status === 'rejected' ? 'Insufficient leave balance' : undefined,
    };
  }));

  await fill('Payroll', 'payroll runs', async () => {
    const out = [];
    for (const month of [6, 7]) {
      for (const st of allStaff) {
        const basic = int(22000, 68000) * RUPEE;
        const hra = Math.round(basic * 0.4);
        const da = Math.round(basic * 0.12);
        const ta = 1600 * RUPEE;
        const gross = basic + hra + da + ta;
        const pf = Math.round(basic * 0.12);
        const professionalTax = 200 * RUPEE;
        const tds = gross > 50000 * RUPEE ? Math.round(gross * 0.05) : 0;
        const totalDeductions = pf + professionalTax + tds;
        out.push({
          tenantId,
          staffId: st._id,
          month,
          year: 2026,
          earnings: { basic, da, hra, ta, specialAllowance: 0, bonus: 0, incentive: 0, total: gross },
          deductions: { pf, esic: 0, professionalTax, tds, lop: 0, loanEmi: 0, total: totalDeductions },
          netSalary: gross - totalDeductions,
          daysWorked: month === 6 ? 30 : 31,
          lopDays: 0,
          status: month === 6 ? 'paid' : 'processed',
          paidAt: month === 6 ? new Date(2026, 6, 1) : undefined,
          bankRef: month === 6 ? `NEFT${int(100000, 999999)}` : undefined,
        });
      }
    }
    return out;
  });

  // ── Communication & calendar ───────────────────────────────────────────────
  await fill('Notice', 'notices', async () => [
    ['Half Yearly Examination Timetable Released', 'The Half Yearly Examination timetable for Classes 1 to 12 has been released. Students may collect a printed copy from their class teacher.', 'exam'],
    ['Independence Day Celebration — 15th August', 'Flag hoisting at 8:00 AM followed by cultural programmes. Attendance is compulsory for all students in full school uniform.', 'event'],
    ['Second Term Fee Due — 15th October', 'Parents are requested to pay the Term 2 fee on or before 15th October 2026. A late fee of ₹20 per day applies after the grace period.', 'fee'],
    ['Parent Teacher Meeting — 30th August', 'PTM for Classes 1 to 8 from 9:00 AM to 12:00 PM and Classes 9 to 12 from 1:00 PM to 4:00 PM.', 'academic'],
    ['Monsoon Advisory', 'In case of heavy rainfall, closure will be announced by 6:30 AM on the school app and SMS. Parents are advised not to send children in ambiguous weather.', 'emergency'],
    ['Inter-House Sports Meet — September', 'The annual inter-house sports meet will be held in the first week of September. Trials begin next Monday.', 'general'],
  ].map(([title, content, type], i) => ({
    tenantId, branchId,
    title,
    content,
    type,
    audience: { scope: 'school' },
    isPublished: true,
    publishAt: new Date(2026, 7, i + 1),
    createdBy: principal?._id,
  })));

  await fill('Event', 'calendar events', async () => [
    ['Independence Day', 'holiday', '2026-08-15', '2026-08-15'],
    ['Raksha Bandhan', 'holiday', '2026-08-28', '2026-08-28'],
    ['Parent Teacher Meeting', 'meeting', '2026-08-30', '2026-08-30'],
    ['Inter-House Sports Meet', 'sports', '2026-09-03', '2026-09-05'],
    ['Half Yearly Examination', 'exam', '2026-09-14', '2026-09-25'],
    ['Gandhi Jayanti', 'holiday', '2026-10-02', '2026-10-02'],
    ['Diwali Vacation', 'holiday', '2026-11-05', '2026-11-15'],
    ['Annual Day', 'cultural', '2026-12-20', '2026-12-20'],
  ].map(([title, type, s, e]) => ({
    tenantId, branchId,
    title,
    type,
    startDate: new Date(s),
    endDate: new Date(e),
    allDay: true,
    audience: 'all',
    venue: type === 'holiday' ? '' : 'School Campus',
    isPublished: true,
    createdBy: principal?._id,
  })));

  await fill('MealMenu', 'meal menus', async () => {
    const out = [];
    const menus = [
      ['Roti, Dal, Rice, Sabji, Salad', 'lunch'],
      ['Poha, Banana, Milk', 'breakfast'],
      ['Khichdi, Kadhi, Papad', 'lunch'],
      ['Upma, Sprouts, Tea', 'breakfast'],
      ['Pulao, Raita, Sweet', 'lunch'],
      ['Biscuits, Fruit, Milk', 'snack'],
    ];
    for (let d = 0; d < 12; d++) {
      const [items, mealType] = menus[d % menus.length];
      const date = new Date(2026, 7, 17 + d);
      out.push({ tenantId, academicYearId, date, mealType, items: items.split(', '), notes: 'Vegetarian' });
    }
    return out;
  });

  await fill('Task', 'tasks', async () => [
    ['Publish Half Yearly result', 'high', 'in_progress', 'exams'],
    ['Verify UDISE+ student data', 'high', 'open', 'students'],
    ['Renew bus fitness certificates', 'medium', 'open', 'transport'],
    ['Collect Term 2 fee defaulter list', 'medium', 'in_progress', 'fees'],
    ['Order lab consumables', 'low', 'open', 'inventory'],
    ['Update library catalogue', 'low', 'done', 'library'],
    ['Schedule fire drill', 'medium', 'open', 'settings'],
  ].map(([title, priority, status, module]) => ({
    tenantId,
    title,
    description: 'Demo task seeded for the task board.',
    priority,
    status,
    module,
    dueDate: new Date(2026, 7, int(20, 31)),
    assignedTo: principal?._id,
    assignedBy: principal?._id,
  })));

  // ── Portal users: one parent, one student, wired to real records ───────────
  console.log('\nPortal users');
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const User = M('User');
  const UserRole = M('UserRole');
  const Role = M('Role');

  async function portalUser({ name, email, roleSlug, extra }) {
    let user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      user = await User.create({
        tenantId, branchId, name, email, passwordHash, role: roleSlug, isActive: true, ...extra,
      });
    }
    const role = await Role.findOne({ slug: roleSlug, deletedAt: null, $or: [{ tenantId }, { tenantId: null }] }).sort({ tenantId: -1 });
    if (role) {
      await UserRole.updateOne(
        { tenantId, userId: user._id, roleId: role._id },
        { $setOnInsert: { tenantId, userId: user._id, roleId: role._id, roleSlug, isPrimary: true, isActive: true, validFrom: new Date() } },
        { upsert: true },
      );
    }
    return user;
  }

  // A student in Class 8 A, so the parent/student portals resolve to a real class with
  // attendance, homework, fees and marks already present.
  const demoStudent = allStudents.find((s) => {
    const std = standards.find((x) => String(x._id) === String(s.standardId));
    return std?.name === 'Class 8' && s.divisionName === 'A';
  }) ?? allStudents[0];

  const parent = await portalUser({
    name: demoStudent.guardians?.[0]?.name ?? 'Demo Parent',
    email: `parent@${SLUG}.school`,
    roleSlug: 'parent',
    extra: { linkedStudentIds: [demoStudent._id] },
  });
  const studentUser = await portalUser({
    name: demoStudent.name,
    email: `student@${SLUG}.school`,
    roleSlug: 'student',
    extra: { studentId: demoStudent._id },
  });

  await M('Student').updateOne(
    { _id: demoStudent._id },
    { $set: { 'guardians.0.userId': parent._id, 'guardians.0.email': parent.email } },
  );
  note('portal users', `parent@${SLUG}.school, student@${SLUG}.school → ${demoStudent.name} (${demoStudent.admissionNo})`);
  void studentUser;

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log(`  Demo data ready for tenant "${SLUG}"`);
  console.log(`  Password for every account: ${password}`);
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('\nseed-demo-data failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { main };
