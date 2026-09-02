/**
 * The route registry — every application route, with the permission it requires.
 *
 * This closes defect A11. Previously only 7 of ~40 routes were wrapped in `<ModuleRoute>`
 * by hand, so any authenticated user could navigate to `/hr/payroll` and land on a broken
 * page whose API calls 403'd. Declaring the guard as data, and applying it in one place in
 * the router, makes an unguarded route impossible to ship.
 *
 * `module` uses the RBAC vocabulary (architecture §7.2) — the same keys the API checks.
 */
export type RouteAction = 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export';

export interface RouteGuard {
  path: string;
  module?: string;
  action?: RouteAction;
  /** Routes every signed-in user may reach regardless of role. */
  public?: boolean;
  superAdminOnly?: boolean;
}

export const ROUTE_GUARDS: RouteGuard[] = [
  // Always available to a signed-in user.
  { path: '', public: true }, // dashboard index
  { path: 'settings/profile', public: true },

  // Students
  { path: 'students', module: 'students' },
  { path: 'students/documents', module: 'students', action: 'edit' },
  { path: 'students/id-cards', module: 'students', action: 'edit' },
  { path: 'students/:id', module: 'students' },

  // Admissions
  { path: 'admissions/enquiries', module: 'admissions' },
  { path: 'admissions/form', module: 'admissions', action: 'add' },
  { path: 'admissions/rte', module: 'admissions' },

  // Academics
  { path: 'academics/years', module: 'academics' },
  { path: 'academics/standards', module: 'academics' },
  { path: 'academics/subjects', module: 'academics' },
  { path: 'academics/timetable', module: 'timetable' },
  { path: 'academics/syllabus', module: 'study_material' },

  // Daily operations
  { path: 'attendance', module: 'attendance' },
  { path: 'homework', module: 'homework' },
  { path: 'study-material', module: 'study_material' },

  // Fees
  { path: 'fees/structures', module: 'fees', action: 'edit' },
  { path: 'fees/demands', module: 'fees', action: 'edit' },
  { path: 'fees/payments', module: 'fees', action: 'add' },
  { path: 'fees/concessions', module: 'fees', action: 'approve' },
  { path: 'fees/defaulters', module: 'fees' },

  // Exams
  { path: 'exams', module: 'examinations' },
  { path: 'exams/marks', module: 'examinations', action: 'add' },
  { path: 'exams/report-cards', module: 'examinations' },
  { path: 'exams/analytics', module: 'examinations', action: 'export' },

  // HR & payroll — previously unguarded entirely.
  { path: 'hr/staff', module: 'hr' },
  { path: 'hr/leaves', module: 'hr' },
  { path: 'hr/payroll', module: 'payroll' },
  { path: 'hr/salary-slips', module: 'payroll' },

  // Services
  { path: 'library', module: 'library' },
  { path: 'transport', module: 'transport' },
  { path: 'hostel', module: 'hostel' },
  { path: 'hostel/meals', module: 'meals' },
  { path: 'discipline', module: 'discipline' },
  { path: 'health', module: 'health' },
  { path: 'alumni', module: 'alumni' },
  { path: 'tasks', module: 'tasks' },
  { path: 'inventory', module: 'inventory' },
  { path: 'events', module: 'events' },

  // Communication & front office
  { path: 'communication/notices', module: 'communication' },
  { path: 'communication/sms', module: 'communication', action: 'edit' },
  { path: 'frontoffice/visitors', module: 'visitor_management' },
  { path: 'frontoffice/certificates', module: 'certificates' },

  // Finance
  { path: 'finance/expenses', module: 'expenses' },

  // Reports, approvals, audit
  { path: 'reports', module: 'reports' },
  { path: 'approvals', module: 'approvals' },
  { path: 'audit-logs', module: 'audit_logs' },

  // Settings
  { path: 'settings/school', module: 'settings' },
  { path: 'settings/roles', module: 'role_management' },
  { path: 'settings/users', module: 'role_management' },
  { path: 'settings/modules', module: 'settings', action: 'edit' },

  // Platform console
  { path: 'super', superAdminOnly: true },
  { path: 'super/tenants', superAdminOnly: true },
  { path: 'super/plans', superAdminOnly: true },
  { path: 'super/tenants/:tenantId/modules', superAdminOnly: true },
  { path: 'super/provisioning', superAdminOnly: true },
  { path: 'super/analytics', superAdminOnly: true },
  { path: 'super/health', superAdminOnly: true },
  { path: 'super/security', superAdminOnly: true },
];

const byPath = new Map(ROUTE_GUARDS.map((g) => [g.path, g]));

export function guardFor(path: string): RouteGuard | undefined {
  return byPath.get(path);
}

/**
 * Every path the router defines must appear here.
 * Called by a test so a new route cannot be added without declaring its permission.
 */
export function findUndeclared(paths: string[]): string[] {
  return paths.filter((p) => !byPath.has(p));
}
