/**
 * The RBAC vocabulary — modules, actions, and scope dimensions.
 *
 * Architecture §7.2 / ADR-05. This unifies the two vocabularies that previously coexisted:
 *   - the Permission collection used `add`  + modules like `examinations`, `expenses`
 *   - the Role collection used       `create` + plan modules like `exams`, `expense`
 * which is why `frontend/src/config/moduleAliases.ts` had to exist. One vocabulary now;
 * the alias map is deleted once the migration runs.
 */

/** The six canonical actions. */
const ACTIONS = ['view', 'add', 'edit', 'delete', 'approve', 'export'];

/** Compact letter codes used by the matrix DSL: v a e d p x. */
const ACTION_CODE = { v: 'view', a: 'add', e: 'edit', d: 'delete', p: 'approve', x: 'export' };

/** action → Permission document field. */
const ACTION_FIELD = {
  view: 'canView',
  add: 'canAdd',
  edit: 'canEdit',
  delete: 'canDelete',
  approve: 'canApprove',
  export: 'canExport',
};

/** The canonical RBAC module keys. */
const MODULES = [
  'dashboard',
  'admissions',
  'students',
  'academics',
  'timetable',
  'attendance',
  'homework',
  'study_material',
  'examinations',
  'fees',
  'payroll',
  'hr',
  'library',
  'transport',
  'hostel',
  'meals',
  'discipline',
  'health',
  'inventory',
  'expenses',
  'certificates',
  'events',
  'alumni',
  'visitor_management',
  'communication',
  'tasks',
  'approvals',
  'reports',
  'settings',
  'role_management',
  'audit_logs',
];

/**
 * Modules where a `delete` is resolved by INTERSECTION across a user's roles
 * (most restrictive wins) rather than union. RBAC doc, multi-role resolution rule.
 */
const SENSITIVE_MODULES = ['fees', 'payroll', 'examinations', 'certificates'];

/** RBAC module key → the plan/`enabledModules` slug that gates it. */
const MODULE_TO_PLAN_SLUG = {
  admissions: 'admissions',
  students: 'students',
  academics: 'academics',
  timetable: 'academics',
  attendance: 'attendance',
  homework: 'homework',
  study_material: 'study_material',
  examinations: 'exams',
  fees: 'fees',
  payroll: 'payroll',
  hr: 'hr',
  library: 'library',
  transport: 'transport',
  hostel: 'hostel',
  meals: 'hostel',
  discipline: 'discipline',
  health: 'health',
  inventory: 'inventory',
  expenses: 'expense',
  certificates: 'certificates',
  events: 'events',
  alumni: 'alumni',
  visitor_management: 'visitors',
  communication: 'communication',
  tasks: 'tasks',
  reports: 'reports',
  // Always available regardless of plan:
  dashboard: null,
  approvals: null,
  settings: null,
  role_management: null,
  audit_logs: null,
};

const BRANCH_SCOPES = ['all_branches', 'assigned_branches', 'own_branch', 'none'];
const DATA_SCOPES = ['group', 'school', 'department', 'division', 'own', 'none'];
const STUDENT_SCOPES = ['all', 'assigned_students', 'own_children', 'own', 'none'];
/** RBAC doc scope dimension #4 — was specified but missing from the model entirely. */
const TEMPORAL_SCOPES = ['current_ay', 'historical_read', 'all_years'];

const EMPTY_PERMISSION = Object.freeze({
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canExport: false,
  branchScope: 'none',
  dataScope: 'none',
  studentScope: 'none',
  temporalScope: 'current_ay',
});

module.exports = {
  ACTIONS,
  ACTION_CODE,
  ACTION_FIELD,
  MODULES,
  SENSITIVE_MODULES,
  MODULE_TO_PLAN_SLUG,
  BRANCH_SCOPES,
  DATA_SCOPES,
  STUDENT_SCOPES,
  TEMPORAL_SCOPES,
  EMPTY_PERMISSION,
};
