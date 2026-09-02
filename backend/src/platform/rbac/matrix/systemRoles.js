/**
 * The 12 system roles (ADR-05 / feature-brainstorm §5.1).
 *
 * Derived from `Enterprise_School_ERP Plan.docx` §4 (the canonical 12) with the permission
 * detail taken from `RBAC_Permission_Architecture_Plan.md` Section 3 Groups A–F.
 *
 * These are seeded once, are not deletable, and are what `User.role` references.
 * Everything else ships as an editable template (see ./templates.js).
 */
const { MODULES } = require('../actions');
const { P, NONE, VIEW, READ, FULL, MANAGE, APPROVE, CONTRIBUTE, completeRow } = require('./dsl');

const GROUP = { b: 'all_branches', d: 'group' };
const SCHOOL = { b: 'own_branch', d: 'school' };
const OWN = { b: 'own_branch', d: 'own', s: 'assigned_students' };
const SELF = { b: 'own_branch', d: 'own', s: 'own' };
const CHILDREN = { b: 'own_branch', d: 'own', s: 'own_children' };

const SYSTEM_ROLES = {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. SUPER ADMIN — platform operator.
  // RBAC §2.1: student PII is blocked by default. Support access is granted
  // explicitly, time-boxed and audited (verification C20).
  // ───────────────────────────────────────────────────────────────────────────
  super_admin: {
    label: 'Super Admin',
    tier: 'platform',
    description: 'Platform owner. Manages all tenants, plans and billing. No student PII by default.',
    permissions: {
      dashboard: READ(GROUP),
      settings: MANAGE({ ...GROUP, s: 'none' }),
      role_management: MANAGE({ ...GROUP, s: 'none' }),
      audit_logs: READ({ ...GROUP, s: 'none' }),
      reports: READ({ ...GROUP, s: 'none' }),
      communication: FULL({ ...GROUP, s: 'none' }),
      // Deliberately NONE: students, fees, payroll, marks, health, discipline.
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SCHOOL ADMIN — tenant owner. Configures the school, then runs it.
  // Plan.docx §9.
  // ───────────────────────────────────────────────────────────────────────────
  school_admin: {
    label: 'School Admin',
    tier: 'tenant',
    description: 'Tenant owner. School setup, users, roles, modules, branding, integrations.',
    permissions: {
      dashboard: READ({ b: 'all_branches', d: 'school' }),
      admissions: MANAGE({ b: 'all_branches', d: 'school' }),
      students: MANAGE({ b: 'all_branches', d: 'school' }),
      academics: MANAGE({ b: 'all_branches', d: 'school' }),
      timetable: MANAGE({ b: 'all_branches', d: 'school' }),
      attendance: MANAGE({ b: 'all_branches', d: 'school' }),
      homework: READ({ b: 'all_branches', d: 'school' }),
      study_material: READ({ b: 'all_branches', d: 'school' }),
      examinations: MANAGE({ b: 'all_branches', d: 'school' }),
      fees: MANAGE({ b: 'all_branches', d: 'school' }),
      payroll: APPROVE({ b: 'all_branches', d: 'school', s: 'none' }),
      hr: MANAGE({ b: 'all_branches', d: 'school', s: 'none' }),
      library: MANAGE({ b: 'all_branches', d: 'school' }),
      transport: MANAGE({ b: 'all_branches', d: 'school' }),
      hostel: MANAGE({ b: 'all_branches', d: 'school' }),
      meals: MANAGE({ b: 'all_branches', d: 'school' }),
      discipline: MANAGE({ b: 'all_branches', d: 'school' }),
      health: VIEW({ b: 'all_branches', d: 'school' }),
      inventory: MANAGE({ b: 'all_branches', d: 'school' }),
      expenses: MANAGE({ b: 'all_branches', d: 'school' }),
      certificates: MANAGE({ b: 'all_branches', d: 'school' }),
      events: MANAGE({ b: 'all_branches', d: 'school' }),
      alumni: MANAGE({ b: 'all_branches', d: 'school' }),
      visitor_management: MANAGE({ b: 'all_branches', d: 'school' }),
      communication: MANAGE({ b: 'all_branches', d: 'school' }),
      tasks: MANAGE({ b: 'all_branches', d: 'school' }),
      approvals: MANAGE({ b: 'all_branches', d: 'school' }),
      reports: READ({ b: 'all_branches', d: 'school' }),
      settings: MANAGE({ b: 'all_branches', d: 'school' }),
      role_management: MANAGE({ b: 'all_branches', d: 'school' }),
      audit_logs: READ({ b: 'all_branches', d: 'school' }),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PRINCIPAL — full authority over ONE branch. RBAC §2.6, Group B.
  // ───────────────────────────────────────────────────────────────────────────
  principal: {
    label: 'Principal',
    tier: 'branch',
    description: 'Full academic and operational authority within the branch. Primary approver.',
    permissions: {
      dashboard: READ(SCHOOL),
      admissions: MANAGE(SCHOOL),
      students: MANAGE(SCHOOL),
      academics: MANAGE(SCHOOL),
      timetable: MANAGE(SCHOOL),
      attendance: MANAGE(SCHOOL),
      homework: READ(SCHOOL),
      study_material: READ(SCHOOL),
      // RBAC Group B: Principal = "Y (approve)" — full access plus approval authority.
      examinations: MANAGE(SCHOOL),
      fees: MANAGE(SCHOOL),
      payroll: APPROVE({ ...SCHOOL, s: 'none' }),
      hr: MANAGE({ ...SCHOOL, s: 'none' }),
      library: MANAGE(SCHOOL),
      transport: MANAGE(SCHOOL),
      hostel: MANAGE(SCHOOL),
      meals: MANAGE(SCHOOL),
      discipline: MANAGE(SCHOOL),
      health: VIEW(SCHOOL),
      inventory: APPROVE(SCHOOL),
      expenses: APPROVE(SCHOOL),
      certificates: MANAGE(SCHOOL),
      events: MANAGE(SCHOOL),
      alumni: READ(SCHOOL),
      visitor_management: MANAGE(SCHOOL),
      communication: MANAGE(SCHOOL),
      tasks: MANAGE(SCHOOL),
      approvals: MANAGE(SCHOOL),
      reports: READ(SCHOOL),
      settings: FULL(SCHOOL),
      role_management: FULL(SCHOOL),
      audit_logs: READ(SCHOOL),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. TEACHER — subject teacher. RBAC §2.14, Group C.
  // dataScope 'own' = only the subjects/groups they are assigned to.
  // ───────────────────────────────────────────────────────────────────────────
  teacher: {
    label: 'Teacher',
    tier: 'operational',
    description: 'Teaches assigned subjects. Lesson plans, classwork, homework, marks entry.',
    permissions: {
      dashboard: VIEW(OWN),
      students: VIEW(OWN),
      academics: CONTRIBUTE(OWN),
      timetable: VIEW(OWN),
      attendance: P('vae', OWN),
      homework: FULL(OWN),
      study_material: FULL(OWN),
      examinations: P('vaex', OWN),
      events: VIEW(SCHOOL),
      communication: P('vae', OWN),
      tasks: P('vae', OWN),
      approvals: P('va', { b: 'own_branch', d: 'own', s: 'none' }),
      reports: READ(OWN),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. STUDENT — RBAC §2.33, Group F. Own data only.
  // Fees is view-only: specification §11 forbids payment by a minor.
  // ───────────────────────────────────────────────────────────────────────────
  student: {
    label: 'Student',
    tier: 'portal',
    description: 'Portal user. Own timetable, homework, study material, results and library.',
    permissions: {
      dashboard: VIEW(SELF),
      students: VIEW(SELF),
      academics: VIEW(SELF),
      timetable: VIEW(SELF),
      attendance: VIEW(SELF),
      homework: P('vae', SELF), // 'edit' = submit their own homework
      study_material: VIEW(SELF),
      examinations: VIEW(SELF),
      fees: VIEW(SELF),
      library: VIEW(SELF),
      hostel: VIEW(SELF),
      certificates: VIEW(SELF),
      events: P('vae', SELF), // register for events
      communication: VIEW(SELF),
      settings: P('ve', SELF),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. PARENT — RBAC §2.32, Group F. Own children only, across branches.
  // ───────────────────────────────────────────────────────────────────────────
  parent: {
    label: 'Parent / Guardian',
    tier: 'portal',
    description: "Portal user. Own children's attendance, marks, fees, homework and transport.",
    permissions: {
      dashboard: VIEW(CHILDREN),
      students: VIEW(CHILDREN),
      attendance: VIEW(CHILDREN),
      timetable: VIEW(CHILDREN),
      homework: VIEW(CHILDREN),
      examinations: VIEW(CHILDREN),
      fees: P('vax', CHILDREN), // 'add' = make a payment
      transport: VIEW(CHILDREN),
      certificates: VIEW(CHILDREN),
      events: P('vae', CHILDREN),
      health: VIEW(CHILDREN),
      communication: P('vae', CHILDREN), // receive + reply
      settings: P('ve', SELF),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 7. ACCOUNTANT — RBAC §2.15, Group D.
  // ───────────────────────────────────────────────────────────────────────────
  accountant: {
    label: 'Accountant',
    tier: 'functional',
    description: 'Fee collection, payroll preparation, expenses, GST and day book.',
    permissions: {
      dashboard: READ(SCHOOL),
      students: VIEW(SCHOOL),
      fees: FULL(SCHOOL),
      payroll: P('vaex', { ...SCHOOL, s: 'none' }), // prepares; does NOT approve (maker≠checker)
      hr: VIEW({ ...SCHOOL, s: 'none' }),
      expenses: FULL(SCHOOL),
      inventory: VIEW(SCHOOL),
      transport: VIEW(SCHOOL),
      hostel: VIEW(SCHOOL),
      certificates: VIEW(SCHOOL), // participates in the TC no-dues check
      communication: P('vae', SCHOOL),
      // 'approve' because the accountant is a designated approver in the fee-concession,
      // payroll-release, expense and certificate workflows (RBAC §5).
      approvals: P('vaep', SCHOOL),
      tasks: P('vae', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 8. HR MANAGER — RBAC §2.17, Group D. Staff data only; no student records.
  // ───────────────────────────────────────────────────────────────────────────
  hr_manager: {
    label: 'HR Manager',
    tier: 'functional',
    description: 'Staff records, leave, payroll structure, appraisals and recruitment.',
    permissions: {
      dashboard: READ({ ...SCHOOL, s: 'none' }),
      hr: MANAGE({ ...SCHOOL, s: 'none' }),
      payroll: P('vaex', { ...SCHOOL, s: 'none' }), // maker
      attendance: P('vaex', { ...SCHOOL, s: 'none' }), // staff attendance
      communication: P('vae', { ...SCHOOL, s: 'none' }),
      approvals: MANAGE({ ...SCHOOL, s: 'none' }),
      tasks: MANAGE({ ...SCHOOL, s: 'none' }),
      reports: READ({ ...SCHOOL, s: 'none' }),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 9. LIBRARIAN — RBAC §2.18, Group D.
  // ───────────────────────────────────────────────────────────────────────────
  librarian: {
    label: 'Librarian',
    tier: 'functional',
    description: 'Catalogue, issue and return, fines, digital library.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      library: MANAGE(SCHOOL),
      students: VIEW(SCHOOL), // borrowing info only
      communication: P('vae', SCHOOL),
      // Library clearance is a step of the certificate/TC workflow (RBAC §5.5).
      approvals: P('vaep', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 10. RECEPTIONIST — RBAC §2.28, Group E. dataScope 'own' = own entries.
  // ───────────────────────────────────────────────────────────────────────────
  receptionist: {
    label: 'Receptionist',
    tier: 'operational',
    description: 'Visitor entry, gate pass, phone log, enquiry capture, OTP dispatch.',
    permissions: {
      dashboard: VIEW({ b: 'own_branch', d: 'own' }),
      visitor_management: FULL({ b: 'own_branch', d: 'own' }),
      admissions: P('va', { b: 'own_branch', d: 'own' }), // create enquiries only
      students: VIEW(SCHOOL), // name/photo/class for dispatch verification
      communication: P('va', { b: 'own_branch', d: 'own' }),
      tasks: VIEW({ b: 'own_branch', d: 'own' }),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 11. DRIVER — RBAC §2.29, Group F. Own route only. Everything else hidden.
  // ───────────────────────────────────────────────────────────────────────────
  driver: {
    label: 'Driver / Conductor',
    tier: 'field',
    description: 'Route start/stop, student boarding scan, SOS, fuel log.',
    permissions: {
      dashboard: VIEW({ b: 'own_branch', d: 'own', s: 'assigned_students' }),
      transport: P('vae', { b: 'own_branch', d: 'own', s: 'assigned_students' }),
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 12. TRANSPORT MANAGER — RBAC §2.19, Group D.
  // ───────────────────────────────────────────────────────────────────────────
  transport_manager: {
    label: 'Transport Manager',
    tier: 'functional',
    description: 'Vehicles, routes, drivers, student allocation, GPS, maintenance.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      transport: MANAGE(SCHOOL),
      students: VIEW(SCHOOL), // transport allocation
      expenses: VIEW(SCHOOL),
      communication: P('vae', SCHOOL),
      tasks: P('vae', SCHOOL),
      reports: READ(SCHOOL),
    },
  },
};

/** Every role row filled out to all MODULES, so a lookup never returns undefined. */
function buildMatrix() {
  const out = {};
  for (const [key, def] of Object.entries(SYSTEM_ROLES)) {
    out[key] = {
      ...def,
      slug: key,
      isSystem: true,
      permissions: completeRow(def.permissions, MODULES),
    };
  }
  return out;
}

const SYSTEM_ROLE_KEYS = Object.keys(SYSTEM_ROLES);

module.exports = { SYSTEM_ROLES, SYSTEM_ROLE_KEYS, buildMatrix, NONE };
