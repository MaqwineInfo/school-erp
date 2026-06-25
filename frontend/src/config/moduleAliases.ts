/**
 * Maps RBAC permission module keys → tenant plan enabledModules keys.
 * Plan/tenant seeds use short names (exams, expense, visitors); Permission model uses canonical names.
 */
export const TENANT_MODULE_ALIASES: Record<string, string[]> = {
  examinations: ['examinations', 'exams'],
  expenses: ['expenses', 'expense'],
  visitor_management: ['visitor_management', 'visitors'],
  study_material: ['study_material'],
  communication: ['communication'],
  admissions: ['admissions'],
  students: ['students'],
  academics: ['academics'],
  attendance: ['attendance'],
  fees: ['fees'],
  homework: ['homework'],
  payroll: ['payroll'],
  hr: ['hr'],
  transport: ['transport'],
  hostel: ['hostel'],
  library: ['library'],
  inventory: ['inventory'],
  certificates: ['certificates'],
  events: ['events'],
  tasks: ['tasks'],
  reports: ['reports'],
  settings: ['settings'],
  role_management: ['role_management'],
  audit_logs: ['audit_logs'],
  dashboard: ['dashboard'],
};

/** Health records UI is gated via students edit permission (no separate plan module). */
export const HEALTH_MODULE = 'students';
