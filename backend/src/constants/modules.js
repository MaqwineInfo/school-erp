/** SaaS plan module slugs — single source of truth (mirrors Plan.MODULE_LIST) */
const PLAN_MODULE_LIST = [
  'admissions', 'students', 'academics', 'attendance', 'fees', 'exams', 'homework',
  'study_material', 'communication', 'transport', 'hostel', 'library', 'hr', 'payroll',
  'discipline', 'health', 'events', 'inventory', 'expense', 'visitors', 'certificates',
  'alumni', 'tasks', 'reports', 'website_builder', 'multi_branch', 'white_label', 'ai_features',
  'mobile_app', 'api_access',
];

/** Modules toggled in school admin UI (excludes SaaS-only add-ons) */
const SCHOOL_MODULE_LIST = PLAN_MODULE_LIST.filter(
  (m) => !['website_builder', 'multi_branch', 'white_label', 'ai_features', 'mobile_app', 'api_access'].includes(m)
);

module.exports = { PLAN_MODULE_LIST, SCHOOL_MODULE_LIST };
