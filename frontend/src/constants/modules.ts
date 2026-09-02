/** School-admin togglable modules — aligned with backend Plan.MODULE_LIST */
export const SCHOOL_MODULES = [
  { slug: 'admissions', label: 'Admissions', desc: 'Enquiries, online form, RTE tracking' },
  { slug: 'students', label: 'Students', desc: 'Student database, 360° profile, ID cards' },
  { slug: 'academics', label: 'Academics', desc: 'Years, classes, sections, subjects, timetable' },
  { slug: 'attendance', label: 'Attendance', desc: 'Daily and period-wise attendance' },
  { slug: 'homework', label: 'Homework', desc: 'Classwork, homework, assignments' },
  { slug: 'exams', label: 'Exams & Marks', desc: 'Exam schedule, marks, report cards' },
  { slug: 'fees', label: 'Fees', desc: 'Structures, demands, collection, concessions' },
  { slug: 'hr', label: 'HR & Staff', desc: 'Staff profiles and leave' },
  { slug: 'payroll', label: 'Payroll', desc: 'Salary processing and payslips' },
  { slug: 'library', label: 'Library', desc: 'Books, issue, return, fines' },
  { slug: 'transport', label: 'Transport', desc: 'Routes, vehicles, allocation' },
  { slug: 'hostel', label: 'Hostel', desc: 'Rooms, allocation, warden' },
  { slug: 'communication', label: 'Communication', desc: 'Notices, SMS, WhatsApp' },
  { slug: 'expense', label: 'Expenses', desc: 'Expense vouchers, petty cash' },
  { slug: 'visitors', label: 'Visitors', desc: 'Gate pass, front office' },
  { slug: 'certificates', label: 'Certificates', desc: 'TC, bonafide, custom templates' },
  { slug: 'discipline', label: 'Discipline', desc: 'Merits, demerits, incidents' },
  { slug: 'alumni', label: 'Alumni', desc: 'Alumni directory and outreach' },
  { slug: 'health', label: 'Health', desc: 'Medical records, clinic log' },
  { slug: 'events', label: 'Events', desc: 'Calendar, events, gallery' },
  { slug: 'inventory', label: 'Inventory', desc: 'Assets and consumables' },
  { slug: 'study_material', label: 'Study Material', desc: 'Syllabus, notes, LMS content' },
  { slug: 'reports', label: 'Reports', desc: 'Analytics and exports' },
  { slug: 'tasks', label: 'Tasks & Approvals', desc: 'Workflow tasks and approval queue' },
] as const;

export const SUPER_ADMIN_MODULES = [
  ...SCHOOL_MODULES.map((m) => m.slug),
  'website_builder', 'multi_branch', 'white_label', 'ai_features', 'mobile_app', 'api_access',
];
