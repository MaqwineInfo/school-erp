/**
 * Custom-role templates (feature-brainstorm §5.2 / ADR-05).
 *
 * These are seeded per tenant as ordinary editable `Role` documents. A school enables the
 * ones it needs, edits them freely, clones them, or deletes them. This is how the RBAC
 * document's 34-role model is preserved without hard-coding 34 system roles.
 *
 * Permission detail: RBAC_Permission_Architecture_Plan.md Section 3, Groups A–F.
 */
const { MODULES } = require('../actions');
const { P, VIEW, READ, FULL, MANAGE, APPROVE, CONTRIBUTE, completeRow } = require('./dsl');

const GROUP = { b: 'all_branches', d: 'group' };
const GROUP_SCHOOL = { b: 'all_branches', d: 'school' };
const SCHOOL = { b: 'own_branch', d: 'school' };
const DEPT = { b: 'own_branch', d: 'department', s: 'assigned_students' };
const DIVISION = { b: 'own_branch', d: 'division', s: 'assigned_students' };
const OWN = { b: 'own_branch', d: 'own', s: 'assigned_students' };
const NO_STUDENTS = { b: 'own_branch', d: 'school', s: 'none' };

const TEMPLATES = {
  // ═══ Tier 1 — Group / Trust ═════════════════════════════════════════════════
  trustee: {
    label: 'Trustee / School Owner',
    tier: 'group',
    description: 'Strategic oversight of all branches. Approves high-value waivers and payroll.',
    permissions: {
      dashboard: READ(GROUP),
      admissions: READ(GROUP),
      students: READ(GROUP),
      attendance: READ(GROUP),
      academics: READ(GROUP),
      timetable: VIEW(GROUP),
      examinations: READ(GROUP),
      fees: APPROVE(GROUP),
      payroll: READ({ ...GROUP, s: 'none' }),
      hr: READ({ ...GROUP, s: 'none' }),
      transport: VIEW(GROUP),
      hostel: VIEW(GROUP),
      library: VIEW(GROUP),
      inventory: VIEW(GROUP),
      expenses: APPROVE(GROUP),
      events: VIEW(GROUP),
      alumni: VIEW(GROUP),
      approvals: MANAGE(GROUP),
      reports: READ(GROUP),
      settings: VIEW(GROUP),
      audit_logs: READ(GROUP),
    },
  },

  group_academic_director: {
    label: 'Group Academic Director',
    tier: 'group',
    description: 'Cross-branch academic standards, curriculum and exam consistency.',
    permissions: {
      dashboard: READ(GROUP_SCHOOL),
      admissions: VIEW(GROUP_SCHOOL),
      students: VIEW(GROUP_SCHOOL),
      attendance: READ(GROUP_SCHOOL),
      academics: MANAGE(GROUP_SCHOOL),
      timetable: VIEW(GROUP_SCHOOL),
      examinations: MANAGE(GROUP_SCHOOL),
      homework: VIEW(GROUP_SCHOOL),
      study_material: READ(GROUP_SCHOOL),
      communication: P('vae', GROUP_SCHOOL),
      reports: READ(GROUP_SCHOOL),
    },
  },

  group_finance_controller: {
    label: 'Group Finance Controller',
    tier: 'group',
    description: 'Consolidated P&L, payroll release, inter-branch expense approval, GST.',
    permissions: {
      dashboard: READ({ ...GROUP, s: 'none' }),
      fees: MANAGE({ ...GROUP, s: 'all' }),
      payroll: MANAGE({ ...GROUP, s: 'none' }), // holds the release authority
      expenses: MANAGE({ ...GROUP, s: 'none' }),
      inventory: APPROVE({ ...GROUP, s: 'none' }),
      hr: VIEW({ ...GROUP, s: 'none' }),
      approvals: MANAGE({ ...GROUP, s: 'none' }),
      reports: READ({ ...GROUP, s: 'none' }),
      audit_logs: READ({ ...GROUP, s: 'none' }),
    },
  },

  compliance_officer: {
    label: 'Compliance Officer',
    tier: 'group',
    description: 'DPDP, RTE, POSH, GST and board compliance. The only role that may unmask Aadhaar.',
    permissions: {
      dashboard: READ(GROUP_SCHOOL),
      admissions: READ(GROUP_SCHOOL),
      students: READ(GROUP_SCHOOL), // includes the Aadhaar unmask capability
      attendance: VIEW(GROUP_SCHOOL),
      academics: VIEW(GROUP_SCHOOL),
      examinations: VIEW(GROUP_SCHOOL),
      fees: VIEW(GROUP_SCHOOL),
      payroll: VIEW({ ...GROUP_SCHOOL, s: 'none' }),
      hr: VIEW({ ...GROUP_SCHOOL, s: 'none' }),
      discipline: READ(GROUP_SCHOOL),
      health: VIEW(GROUP_SCHOOL),
      expenses: VIEW(GROUP_SCHOOL),
      communication: VIEW(GROUP_SCHOOL),
      reports: READ(GROUP_SCHOOL),
      settings: P('ve', GROUP_SCHOOL),
      audit_logs: READ(GROUP_SCHOOL), // the only role permitted to export audit logs
    },
  },

  // ═══ Tier 2 — Branch leadership ═════════════════════════════════════════════
  branch_admin: {
    label: 'Branch Admin',
    tier: 'branch',
    description: 'Administrative operations of one branch, delegated from the Principal.',
    permissions: {
      dashboard: READ(SCHOOL),
      admissions: VIEW(SCHOOL),
      students: FULL(SCHOOL),
      attendance: VIEW(SCHOOL),
      hr: VIEW({ ...SCHOOL, s: 'none' }),
      library: VIEW(SCHOOL),
      transport: MANAGE(SCHOOL),
      hostel: MANAGE(SCHOOL),
      meals: MANAGE(SCHOOL),
      inventory: MANAGE(SCHOOL),
      expenses: VIEW(SCHOOL),
      events: MANAGE(SCHOOL),
      visitor_management: MANAGE(SCHOOL),
      communication: MANAGE(SCHOOL),
      tasks: MANAGE(SCHOOL),
      approvals: MANAGE(SCHOOL),
      reports: READ(SCHOOL),
      settings: FULL(SCHOOL),
      role_management: FULL(SCHOOL),
      audit_logs: VIEW(SCHOOL),
    },
  },

  vice_principal: {
    label: 'Vice Principal',
    tier: 'branch',
    description: 'Academic deputy. Timetable, syllabus, exams, teacher monitoring, substitutions.',
    permissions: {
      dashboard: READ(SCHOOL),
      admissions: VIEW(SCHOOL),
      students: VIEW(SCHOOL),
      academics: MANAGE(SCHOOL),
      timetable: MANAGE(SCHOOL),
      attendance: READ(SCHOOL),
      examinations: FULL(SCHOOL),
      homework: VIEW(SCHOOL),
      study_material: VIEW(SCHOOL),
      discipline: READ(SCHOOL),
      hr: VIEW({ ...SCHOOL, s: 'none' }),
      library: VIEW(SCHOOL),
      transport: VIEW(SCHOOL),
      hostel: VIEW(SCHOOL),
      certificates: VIEW(SCHOOL),
      events: FULL(SCHOOL),
      visitor_management: VIEW(SCHOOL),
      communication: FULL(SCHOOL),
      tasks: MANAGE(SCHOOL),
      approvals: MANAGE(SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  academic_supervisor: {
    label: 'Academic Supervisor / Coordinator',
    tier: 'branch',
    description: 'Lesson plan review, syllabus completion tracking, CCE coordination.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      students: VIEW(SCHOOL),
      academics: MANAGE(SCHOOL),
      timetable: VIEW(SCHOOL),
      attendance: VIEW(SCHOOL),
      examinations: VIEW(SCHOOL),
      homework: FULL(SCHOOL),
      study_material: FULL(SCHOOL),
      communication: VIEW(SCHOOL),
      tasks: P('vae', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  // ═══ Tier 3 — Academic ══════════════════════════════════════════════════════
  hod: {
    label: 'Head of Department',
    tier: 'department',
    description: 'Subject allocation, mark verification, syllabus review for one department.',
    permissions: {
      dashboard: VIEW(DEPT),
      students: VIEW(DEPT),
      academics: MANAGE(DEPT),
      timetable: VIEW(DEPT),
      attendance: READ(DEPT),
      examinations: APPROVE(DEPT), // verifies and locks departmental marks
      homework: READ(DEPT),
      study_material: FULL(DEPT),
      hr: VIEW({ ...DEPT, s: 'none' }), // leave recommendation for department staff
      inventory: P('va', DEPT), // raise a departmental indent
      events: VIEW(SCHOOL),
      communication: P('vae', DEPT),
      tasks: MANAGE(DEPT),
      approvals: P('vaep', DEPT),
      reports: READ(DEPT),
    },
  },

  exam_coordinator: {
    label: 'Exam Coordinator',
    tier: 'functional',
    description: 'Exam scheduling, seating, invigilation, mark locking, report cards.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      students: VIEW(SCHOOL),
      academics: VIEW(SCHOOL),
      timetable: MANAGE(SCHOOL), // exam date sheet
      examinations: MANAGE(SCHOOL), // holds the lock/unlock authority
      certificates: P('vax', SCHOOL), // report card trigger
      communication: P('vae', SCHOOL),
      tasks: P('vae', SCHOOL),
      approvals: P('vaep', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  class_teacher: {
    label: 'Class Teacher',
    tier: 'operational',
    description: 'Owns one class-section: attendance, discipline, parent contact, report card remarks.',
    permissions: {
      dashboard: VIEW(DIVISION),
      students: P('vae', DIVISION),
      academics: VIEW(DIVISION),
      timetable: VIEW(DIVISION),
      attendance: MANAGE(DIVISION),
      homework: READ(DIVISION),
      study_material: VIEW(DIVISION),
      examinations: READ(DIVISION),
      fees: VIEW(DIVISION), // defaulter list for their own class
      discipline: P('vae', DIVISION),
      health: VIEW(DIVISION),
      library: VIEW(DIVISION),
      transport: VIEW(DIVISION),
      hostel: VIEW(DIVISION),
      certificates: P('va', DIVISION), // initiates TC / Bonafide
      events: VIEW(SCHOOL),
      communication: FULL(DIVISION),
      tasks: P('vae', DIVISION),
      approvals: P('va', DIVISION),
      reports: READ(DIVISION),
    },
  },

  lab_assistant: {
    label: 'Lab Assistant',
    tier: 'operational',
    description: 'Lab equipment, consumables, safety records.',
    permissions: {
      dashboard: VIEW(OWN),
      inventory: P('vae', DEPT),
      study_material: VIEW(DEPT),
      timetable: VIEW(DEPT),
      tasks: P('vae', OWN),
    },
  },

  // ═══ Tier 3 — Admissions ════════════════════════════════════════════════════
  admission_head: {
    label: 'Admission Head',
    tier: 'functional',
    description: 'Owns the enquiry-to-admission pipeline, merit list and seat allocation.',
    permissions: {
      dashboard: READ(SCHOOL),
      admissions: MANAGE(SCHOOL),
      students: P('vaex', SCHOOL),
      academics: VIEW(SCHOOL),
      fees: VIEW(SCHOOL), // fee quotation
      certificates: P('va', SCHOOL), // admission letter
      communication: FULL(SCHOOL),
      tasks: MANAGE(SCHOOL),
      approvals: P('vaep', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  admission_officer: {
    label: 'Admission Officer',
    tier: 'operational',
    description: 'Enquiry capture, follow-up, document checklist, admission forms.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      admissions: FULL(SCHOOL),
      students: P('va', SCHOOL),
      academics: VIEW(SCHOOL),
      fees: VIEW(SCHOOL),
      certificates: P('va', SCHOOL),
      communication: P('vae', SCHOOL),
      tasks: P('vae', SCHOOL),
      // Document verification is step 1 of the admission workflow (RBAC §5.9).
      approvals: P('vaep', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  rte_officer: {
    label: 'RTE Officer',
    tier: 'functional',
    description: 'RTE 25% quota tracking, fee exemption verification, state reporting.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      admissions: P('vaepx', SCHOOL),
      students: READ(SCHOOL),
      fees: APPROVE(SCHOOL), // RTE exemption approval
      certificates: VIEW(SCHOOL),
      communication: P('va', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  // ═══ Tier 3 — Finance & stores ══════════════════════════════════════════════
  cashier: {
    label: 'Cashier',
    tier: 'operational',
    description: 'Counter fee collection only. No structure edits, no waivers, no payroll.',
    permissions: {
      dashboard: VIEW({ b: 'own_branch', d: 'own' }),
      // 'add' only — cannot edit a structure or approve a concession.
      fees: P('va', { b: 'own_branch', d: 'own', s: 'all' }),
      students: VIEW(SCHOOL), // fee status lookup only
    },
  },

  store_manager: {
    label: 'Store Manager',
    tier: 'functional',
    description: 'Stock, indents, vendors, asset register, purchase orders.',
    permissions: {
      dashboard: VIEW({ ...SCHOOL, s: 'none' }),
      inventory: MANAGE({ ...SCHOOL, s: 'none' }),
      expenses: P('vae', { ...SCHOOL, s: 'none' }), // creates purchase vouchers
      tasks: P('vae', { ...SCHOOL, s: 'none' }),
      // Store Manager is step 1 of the inventory workflow (RBAC §5.7).
      approvals: P('vaep', { ...SCHOOL, s: 'none' }),
      reports: READ({ ...SCHOOL, s: 'none' }),
    },
  },

  // ═══ Tier 3 — Operations ════════════════════════════════════════════════════
  hostel_warden: {
    label: 'Hostel Warden',
    tier: 'functional',
    description: 'Room allocation, roll call, gate pass, mess coordination, incident log.',
    permissions: {
      dashboard: VIEW({ b: 'own_branch', d: 'school', s: 'assigned_students' }),
      hostel: MANAGE({ b: 'own_branch', d: 'school', s: 'assigned_students' }),
      meals: MANAGE({ b: 'own_branch', d: 'school', s: 'assigned_students' }),
      attendance: MANAGE({ b: 'own_branch', d: 'school', s: 'assigned_students' }),
      students: VIEW({ b: 'own_branch', d: 'school', s: 'assigned_students' }),
      fees: VIEW({ b: 'own_branch', d: 'school', s: 'assigned_students' }),
      discipline: P('vae', { b: 'own_branch', d: 'school', s: 'assigned_students' }),
      visitor_management: FULL(SCHOOL),
      expenses: VIEW(SCHOOL),
      communication: P('vae', SCHOOL),
      tasks: P('vae', SCHOOL),
      approvals: P('vaep', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  mess_manager: {
    label: 'Mess Manager',
    tier: 'operational',
    description: 'Weekly menu, kitchen stock, nutritional tracking.',
    permissions: {
      dashboard: VIEW({ ...SCHOOL, s: 'none' }),
      meals: MANAGE({ ...SCHOOL, s: 'none' }),
      inventory: P('vae', { ...SCHOOL, s: 'none' }),
      expenses: P('va', { ...SCHOOL, s: 'none' }),
      reports: READ({ ...SCHOOL, s: 'none' }),
    },
  },

  event_coordinator: {
    label: 'Event Coordinator',
    tier: 'functional',
    description: 'Events, registrations, gallery, participation certificates.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      events: MANAGE(SCHOOL),
      certificates: P('vaex', SCHOOL),
      students: VIEW(SCHOOL),
      inventory: P('va', SCHOOL),
      expenses: VIEW(SCHOOL),
      communication: FULL(SCHOOL),
      tasks: P('vae', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  reception_manager: {
    label: 'Reception Manager',
    tier: 'functional',
    description: 'Front-office supervision, visitor oversight, OTP dispatch management.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      visitor_management: MANAGE(SCHOOL),
      admissions: P('va', SCHOOL),
      students: VIEW(SCHOOL),
      communication: P('vae', SCHOOL),
      tasks: MANAGE(SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  it_admin: {
    label: 'IT Administrator',
    tier: 'functional',
    description: 'System config, integrations, user provisioning, backups. No PII export.',
    permissions: {
      dashboard: VIEW({ ...NO_STUDENTS }),
      settings: MANAGE(NO_STUDENTS),
      // RBAC §2.27: may assign pre-defined roles but NOT create or delete them, and can
      // never assign Super Admin, Trustee or Finance Controller.
      role_management: P('vae', NO_STUDENTS),
      communication: P('vae', NO_STUDENTS),
      audit_logs: VIEW(NO_STUDENTS),
      inventory: VIEW(NO_STUDENTS),
      reports: VIEW(NO_STUDENTS),
    },
  },

  // ═══ Tier 3 — Student support (confidential data) ═══════════════════════════
  counsellor: {
    label: 'Counsellor',
    tier: 'functional',
    description: 'Confidential student sessions, POSH support, career guidance.',
    permissions: {
      dashboard: VIEW(OWN),
      students: VIEW({ b: 'own_branch', d: 'own', s: 'assigned_students' }),
      // Counsellor notes are private: dataScope 'own' means other roles cannot read them.
      discipline: P('vae', { b: 'own_branch', d: 'own', s: 'assigned_students' }),
      health: P('vae', { b: 'own_branch', d: 'own', s: 'assigned_students' }),
      communication: P('vae', { b: 'own_branch', d: 'own', s: 'assigned_students' }),
      tasks: P('vae', OWN),
    },
  },

  discipline_coordinator: {
    label: 'Discipline Coordinator',
    tier: 'functional',
    description: 'Behaviour incidents, anti-bullying, suspension workflow, POSH ICC coordination.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      discipline: MANAGE(SCHOOL),
      students: P('vae', SCHOOL),
      attendance: VIEW(SCHOOL),
      communication: FULL(SCHOOL),
      tasks: MANAGE(SCHOOL),
      approvals: P('vaep', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  school_nurse: {
    label: 'School Nurse / Health Officer',
    tier: 'functional',
    description: 'Medical check-ups, clinic log, vaccinations, allergy records.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      health: MANAGE(SCHOOL),
      students: VIEW(SCHOOL), // health profile only
      discipline: VIEW(SCHOOL),
      inventory: P('va', SCHOOL), // request medical supplies
      hr: VIEW({ b: 'own_branch', d: 'own', s: 'none' }), // own leave
      communication: P('vae', SCHOOL),
      reports: READ(SCHOOL),
    },
  },

  // ═══ Tier 5 — External ══════════════════════════════════════════════════════
  alumni: {
    label: 'Alumni',
    tier: 'portal',
    description: 'Directory, events, donations, mentorship. Historical read of own records only.',
    permissions: {
      dashboard: VIEW({ b: 'own_branch', d: 'own', s: 'own', t: 'historical_read' }),
      alumni: P('vae', { b: 'own_branch', d: 'own', s: 'own', t: 'historical_read' }),
      events: P('vae', { b: 'own_branch', d: 'own', s: 'own' }),
      certificates: VIEW({ b: 'own_branch', d: 'own', s: 'own', t: 'historical_read' }),
      communication: VIEW({ b: 'own_branch', d: 'own', s: 'own' }),
      settings: P('ve', { b: 'own_branch', d: 'own', s: 'own' }),
    },
  },
};

/**
 * Govt/Aided templates — defined but NOT seeded by default (feature-brainstorm §11).
 * Enable by passing { includeGovtAided: true } to the seeder.
 */
const GOVT_AIDED_TEMPLATES = {
  mdm_coordinator: {
    label: 'MDM Coordinator (PM POSHAN)',
    tier: 'functional',
    description: 'Mid-Day Meal beneficiary count, consumption register, state reports.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      meals: MANAGE(SCHOOL),
      students: VIEW(SCHOOL),
      inventory: P('vae', SCHOOL),
      expenses: P('vae', SCHOOL),
      reports: READ(SCHOOL),
    },
  },
  udise_operator: {
    label: 'UDISE+ Data Operator',
    tier: 'operational',
    description: 'Annual demographic data submission to the Ministry of Education.',
    permissions: {
      dashboard: VIEW(SCHOOL),
      students: READ(SCHOOL),
      academics: VIEW(SCHOOL),
      attendance: READ(SCHOOL),
      reports: READ(SCHOOL),
    },
  },
};

function buildTemplates({ includeGovtAided = false } = {}) {
  const source = includeGovtAided ? { ...TEMPLATES, ...GOVT_AIDED_TEMPLATES } : TEMPLATES;
  const out = {};
  for (const [key, def] of Object.entries(source)) {
    out[key] = {
      ...def,
      slug: key,
      isSystem: false,
      isTemplate: true,
      permissions: completeRow(def.permissions, MODULES),
    };
  }
  return out;
}

module.exports = {
  TEMPLATES,
  GOVT_AIDED_TEMPLATES,
  TEMPLATE_KEYS: Object.keys(TEMPLATES),
  buildTemplates,
};
