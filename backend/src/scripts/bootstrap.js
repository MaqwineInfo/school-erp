/**
 * Bootstrap a working system: roles, workflows, templates, a demo school and users.
 *
 * Replaces `seed-full.js` for the migrated modules. That script writes to the legacy
 * `Role.permissions[]` shape and the legacy `Permission` collection, neither of which the
 * new RBAC layer reads (architecture §7.2), so a database seeded with it produces users
 * who can sign in but have no permissions.
 *
 * Run:  npm run bootstrap
 *       npm run bootstrap -- --reset     (drops the demo tenant first)
 *       npm run bootstrap -- --fresh     (drops the ENTIRE database first)
 *
 * `--fresh` exists because overlapping historical seeders left role documents whose
 * `matrix` was empty. `platform/auth/principal.js` prefers a tenant-scoped role over the
 * global one, so an empty tenant role SHADOWS the correct system role and every user
 * holding it signs in with no permissions at all. Role seeding below is therefore forced,
 * and the run asserts no role escapes with an empty matrix.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const config = require('../config/env');

const fs = require('fs');
const path = require('path');

// Every model must be registered before anything resolves mongoose.model(name).

function registerModels() {
  const dir = path.join(__dirname, '..', 'models');
  fs.readdirSync(dir).filter((f) => f.endsWith('.js')).forEach((f) => require(path.join(dir, f)));
}

const SLUG = process.env.DEMO_TENANT_SLUG || 'demo';

async function main() {
  const reset = process.argv.includes('--reset');
  const fresh = process.argv.includes('--fresh');

  await mongoose.connect(config.db.uri);
  registerModels();
  console.log(`Connected to ${mongoose.connection.name}\n`);

  if (fresh) {
    console.log(`--fresh: dropping database "${mongoose.connection.name}"…`);
    await mongoose.connection.dropDatabase();
    // Indexes live on the dropped collections; rebuild them from the schemas so the
    // unique constraints (notably User.email) are in force for the rest of this run.
    for (const name of mongoose.modelNames()) {
      await mongoose.model(name).createIndexes();
    }
    console.log('  database dropped, indexes rebuilt\n');
  }

  const Tenant = mongoose.model('Tenant');
  const Branch = mongoose.model('Branch');
  const AcademicYear = mongoose.model('AcademicYear');
  const Standard = mongoose.model('Standard');
  const AcademicGroup = mongoose.model('AcademicGroup');
  const Subject = mongoose.model('Subject');
  const User = mongoose.model('User');
  const UserRole = mongoose.model('UserRole');
  const Role = mongoose.model('Role');

  if (reset) {
    const existing = await Tenant.findOne({ slug: SLUG });
    if (existing) {
      console.log(`--reset: removing tenant "${SLUG}" and its data…`);
      for (const name of mongoose.modelNames()) {
        const Model = mongoose.model(name);
        if (Model.schema.path('tenantId')) {
          await Model.deleteMany({ tenantId: existing._id });
        }
      }
      await Tenant.deleteOne({ _id: existing._id });
    }
  }

  // ── 1. Roles (global system roles + per-tenant templates) ──────────────────
  // force: true — the matrix in platform/rbac/matrix is the source of truth, and a
  // half-written role from an older seeder must be overwritten, not skipped.
  const { seedSystemRoles, seedTemplatesForTenant } = require('./seed-rbac');
  const sys = await seedSystemRoles({ force: true });
  console.log(`System roles: ${sys.length} seeded`);

  // ── 2. Tenant ──────────────────────────────────────────────────────────────
  const ALL_MODULES = require('../constants/modules').SCHOOL_MODULE_LIST;

  let tenant = await Tenant.findOne({ slug: SLUG, deletedAt: null });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Demo Public School',
      slug: SLUG,
      shortName: 'DPS',
      institutionType: 'school',
      board: 'CBSE',
      city: 'Surat',
      state: 'Gujarat',
      pinCode: '395010',
      email: 'office@demo.school',
      phone: '02614001234',
      status: 'active',
      planName: 'growth',
      enabledModules: ALL_MODULES,
      onboardingCompleted: true,
      settings: { languages: ['en', 'hi', 'gu'] },
    });
    console.log(`Tenant created: ${tenant.name} (/${tenant.slug})`);
  } else {
    console.log(`Tenant exists: ${tenant.name}`);
  }

  const tpl = await seedTemplatesForTenant(tenant, { force: true });
  console.log(`Template roles: ${tpl.length} seeded`);

  // Guard the regression that caused the total lockout: any role reachable by this
  // tenant's users must carry a non-empty matrix, or it silently shadows the system role.
  const hollow = (await Role.find({
    $or: [{ tenantId: tenant._id }, { tenantId: null }], deletedAt: null,
  }).select('slug tenantId matrix').lean())
    .filter((r) => !r.matrix || Object.keys(r.matrix).length === 0)
    .map((r) => `${r.slug}${r.tenantId ? ' (tenant)' : ' (global)'}`);
  if (hollow.length) {
    throw new Error(`Roles seeded with an empty matrix — they would shadow the system role and lock users out: ${hollow.join(', ')}`);
  }

  // ── 3. Approval workflows and message templates ────────────────────────────
  const approvals = require('../modules/approvals');
  const wf = await approvals.service.seedWorkflows(tenant._id);
  console.log(`Approval workflows: ${wf.filter((r) => r.action === 'created').length} created`);

  const communication = require('../modules/communication');
  const templates = await communication.service.seedTemplates(tenant._id);
  console.log(`Message templates: ${templates.filter((r) => r.action === 'created').length} created`);

  // ── 4. Branches, year, classes, sections, subjects ─────────────────────────
  let branch = await Branch.findOne({ tenantId: tenant._id, code: 'MAIN', deletedAt: null });
  if (!branch) {
    branch = await Branch.create({
      tenantId: tenant._id, name: 'Main Campus', code: 'MAIN', isHeadOffice: true,
      city: 'Surat', state: 'Gujarat',
    });
  }

  let year = await AcademicYear.findOne({ tenantId: tenant._id, isActive: true, deletedAt: null });
  if (!year) {
    year = await AcademicYear.create({
      tenantId: tenant._id,
      name: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      terms: [
        { name: 'Term 1', startDate: new Date('2026-04-01'), endDate: new Date('2026-09-30') },
        { name: 'Term 2', startDate: new Date('2026-10-01'), endDate: new Date('2027-03-31') },
      ],
    });
  }

  // Nursery(0) … Class 12 — "standard 0 to 12".
  const CLASSES = [
    ['Nursery', 0, 'pre_primary'], ['LKG', 1, 'pre_primary'], ['UKG', 2, 'pre_primary'],
    ['Class 1', 3, 'primary'], ['Class 2', 4, 'primary'], ['Class 3', 5, 'primary'],
    ['Class 4', 6, 'primary'], ['Class 5', 7, 'primary'],
    ['Class 6', 8, 'middle'], ['Class 7', 9, 'middle'], ['Class 8', 10, 'middle'],
    ['Class 9', 11, 'secondary'], ['Class 10', 12, 'secondary'],
    ['Class 11', 13, 'senior_secondary'], ['Class 12', 14, 'senior_secondary'],
  ];

  let classesCreated = 0;
  let groupsCreated = 0;

  for (const [name, order, stage] of CLASSES) {
    let std = await Standard.findOne({ tenantId: tenant._id, name, deletedAt: null });
    if (!std) {
      std = await Standard.create({
        tenantId: tenant._id, branchId: branch._id, name,
        shortName: name.replace('Class ', ''), order, stage,
      });
      classesCreated += 1;
    }

    for (const section of ['A', 'B']) {
      const exists = await AcademicGroup.findOne({
        tenantId: tenant._id, academicYearId: year._id, standardId: std._id, name: section, deletedAt: null,
      });
      if (!exists) {
        await AcademicGroup.create({
          tenantId: tenant._id,
          branchId: branch._id,
          academicYearId: year._id,
          kind: 'section',
          standardId: std._id,
          name: section,
          displayName: `${name} — ${section}`,
          capacity: 40,
        });
        groupsCreated += 1;
      }
    }
  }
  console.log(`Classes: ${classesCreated} created · Sections: ${groupsCreated} created`);

  const SUBJECTS = [
    ['English', '184', 'core'], ['Hindi', '002', 'language'], ['Gujarati', '', 'language'],
    ['Mathematics', '041', 'core'], ['Science', '086', 'core'], ['Social Science', '087', 'core'],
    ['Computer Science', '083', 'elective'], ['Physical Education', '', 'co_scholastic'],
  ];
  let subjectsCreated = 0;
  for (const [name, code, type] of SUBJECTS) {
    const exists = await Subject.findOne({ tenantId: tenant._id, name, deletedAt: null });
    if (!exists) {
      await Subject.create({ tenantId: tenant._id, branchId: branch._id, name, code, type });
      subjectsCreated += 1;
    }
  }
  console.log(`Subjects: ${subjectsCreated} created`);

  // ── 5. Users ───────────────────────────────────────────────────────────────
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

  async function upsertUser({ name, email, roleSlug, roles, isSuperAdmin = false, tenantScoped = true }) {
    let user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      user = await User.create({
        tenantId: tenantScoped ? tenant._id : null,
        branchId: tenantScoped ? branch._id : null,
        name,
        email,
        passwordHash,
        role: roleSlug,
        isSuperAdmin,
        isActive: true,
      });
    }

    for (const [i, slug] of (roles ?? [roleSlug]).entries()) {
      const role = await Role.findOne({
        slug, deletedAt: null, $or: [{ tenantId: tenantScoped ? tenant._id : null }, { tenantId: null }],
      }).sort({ tenantId: -1 });
      if (!role) continue;

      await UserRole.updateOne(
        { tenantId: user.tenantId, userId: user._id, roleId: role._id },
        {
          $setOnInsert: {
            tenantId: user.tenantId, userId: user._id, roleId: role._id,
            roleSlug: slug, isPrimary: i === 0, isActive: true, validFrom: new Date(),
          },
        },
        { upsert: true },
      );
    }

    return user;
  }

  // One signed-in account per tier, so role-wise access is demonstrable end to end.
  // `roles` (when present) is the authoritative binding list — `roleSlug` is only the
  // denormalised primary used for portal/landing routing.
  const people = [
    // Tier 0 — platform
    { name: 'Platform Admin', email: process.env.SUPER_ADMIN_EMAIL || 'admin@schoolerp.com', roleSlug: 'super_admin', isSuperAdmin: true, tenantScoped: false },
    // Tier 1 — tenant / group
    { name: 'School Admin', email: `admin@${SLUG}.school`, roleSlug: 'school_admin' },
    { name: 'Trustee', email: `trustee@${SLUG}.school`, roleSlug: 'trustee' },
    { name: 'Group Finance Controller', email: `groupfinance@${SLUG}.school`, roleSlug: 'group_finance_controller' },
    { name: 'Compliance Officer', email: `compliance@${SLUG}.school`, roleSlug: 'compliance_officer' },
    // Tier 2 — branch leadership
    { name: 'Principal', email: `principal@${SLUG}.school`, roleSlug: 'principal' },
    { name: 'Vice Principal', email: `vp@${SLUG}.school`, roleSlug: 'vice_principal' },
    { name: 'Branch Admin', email: `branchadmin@${SLUG}.school`, roleSlug: 'branch_admin' },
    // Tier 3 — department / functional heads
    { name: 'HoD Science', email: `hod@${SLUG}.school`, roleSlug: 'hod', roles: ['hod', 'teacher'] },
    { name: 'Exam Coordinator', email: `exams@${SLUG}.school`, roleSlug: 'exam_coordinator' },
    { name: 'Accountant', email: `accounts@${SLUG}.school`, roleSlug: 'accountant' },
    { name: 'HR Manager', email: `hr@${SLUG}.school`, roleSlug: 'hr_manager' },
    { name: 'Librarian', email: `library@${SLUG}.school`, roleSlug: 'librarian' },
    { name: 'Transport Manager', email: `transport@${SLUG}.school`, roleSlug: 'transport_manager' },
    { name: 'Hostel Warden', email: `hostel@${SLUG}.school`, roleSlug: 'hostel_warden' },
    { name: 'Admission Head', email: `admissionhead@${SLUG}.school`, roleSlug: 'admission_head' },
    { name: 'Counsellor', email: `counsellor@${SLUG}.school`, roleSlug: 'counsellor' },
    { name: 'School Nurse', email: `nurse@${SLUG}.school`, roleSlug: 'school_nurse' },
    { name: 'Store Manager', email: `store@${SLUG}.school`, roleSlug: 'store_manager' },
    // Tier 4 — operational staff
    { name: 'Class Teacher 8A', email: `ct8a@${SLUG}.school`, roleSlug: 'class_teacher', roles: ['class_teacher', 'teacher'] },
    { name: 'Subject Teacher', email: `teacher@${SLUG}.school`, roleSlug: 'teacher' },
    { name: 'Admission Officer', email: `admissions@${SLUG}.school`, roleSlug: 'admission_officer' },
    { name: 'Cashier', email: `cashier@${SLUG}.school`, roleSlug: 'cashier' },
    { name: 'Receptionist', email: `reception@${SLUG}.school`, roleSlug: 'receptionist' },
    { name: 'Driver', email: `driver@${SLUG}.school`, roleSlug: 'driver' },
    // Tier 5 — external portals (parent/student are wired to a real child by seed-demo-data)
    { name: 'Alumni Member', email: `alumni@${SLUG}.school`, roleSlug: 'alumni' },
  ];

  const missingRole = [];
  for (const p of people) {
    const created = await upsertUser(p);
    const bound = await UserRole.countDocuments({ userId: created._id, isActive: true });
    if (!bound) missingRole.push(`${p.email} → ${(p.roles ?? [p.roleSlug]).join('+')}`);
  }
  if (missingRole.length) {
    throw new Error(`Users seeded with no role binding — they would sign in with zero permissions: ${missingRole.join(', ')}`);
  }
  console.log(`Users: ${people.length} ensured, all with role bindings`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('  Sign in at http://localhost:3000/login');
  console.log(`  School slug : ${SLUG}`);
  console.log(`  Password    : ${password}   (all demo accounts)`);
  console.log('─────────────────────────────────────────────');
  people.forEach((p) => {
    const extra = p.roles && p.roles.length > 1 ? `  (+${p.roles.slice(1).join(', ')})` : '';
    console.log(`  ${p.roleSlug.padEnd(26)} ${p.email}${extra}`);
  });
  console.log('');

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Bootstrap failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { main };
