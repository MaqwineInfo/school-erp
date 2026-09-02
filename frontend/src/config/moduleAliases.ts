/**
 * Maps RBAC permission module keys → tenant enabledModules slugs (Plan.js).
 */
export const TENANT_MODULE_ALIASES: Record<string, string[]> = {
  admissions: ['admissions'],
  students: ['students'],
  academics: ['academics'],
  attendance: ['attendance'],
  fees: ['fees'],
  examinations: ['examinations', 'exams'],
  homework: ['homework'],
  study_material: ['study_material'],
  communication: ['communication'],
  transport: ['transport'],
  hostel: ['hostel'],
  library: ['library'],
  hr: ['hr'],
  payroll: ['payroll'],
  discipline: ['discipline'],
  health: ['health'],
  events: ['events'],
  inventory: ['inventory'],
  expenses: ['expenses', 'expense', 'finance'],
  expense: ['expense', 'expenses', 'finance'],
  finance: ['expense', 'expenses', 'finance'],
  visitor_management: ['visitor_management', 'visitors'],
  visitors: ['visitors', 'visitor_management'],
  certificates: ['certificates'],
  frontoffice: ['visitors', 'certificates', 'visitor_management'],
  alumni: ['alumni'],
  reports: ['reports'],
  timetable: ['timetable', 'academics'],
  tasks: ['tasks'],
  role_management: ['role_management'],
  audit_logs: ['audit_logs'],
  dashboard: ['dashboard'],
  settings: ['settings'],
};

/** Legacy alias — health UI uses health module when enabled, else students edit */
export const HEALTH_MODULE = 'health';
