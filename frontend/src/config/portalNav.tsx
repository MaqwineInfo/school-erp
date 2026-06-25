import React from 'react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  IndianRupee, FileText, Clock, Bus, Home, Library, UserCog,
  Bell, Calendar, Package, Award, Heart, Building2, BarChart3,
  MessageSquare, ShieldCheck, UserPlus, School, Settings, Shield,
  ScrollText, Stethoscope, Warehouse, DollarSign,
} from 'lucide-react';

export type NavAction = 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export';

export interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  /** RBAC permission module key */
  module?: string;
  /** Required action on module (default: view) */
  action?: NavAction;
  superAdminOnly?: boolean;
}

// ─── ClassCare-style portal menus (5–10 items max) ───────────────────────────

export const PARENT_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Children', path: '/students', icon: <Users className="w-4 h-4" />, module: 'students' },
  { label: 'Attendance', path: '/attendance', icon: <UserCheckIcon />, module: 'attendance' },
  { label: 'Homework', path: '/homework', icon: <ClipboardList className="w-4 h-4" />, module: 'homework' },
  { label: 'Timetable', path: '/academics/timetable', icon: <Clock className="w-4 h-4" />, module: 'timetable' },
  { label: 'Results', path: '/exams/report-cards', icon: <Award className="w-4 h-4" />, module: 'examinations' },
  { label: 'Fee Payment', path: '/fees/payments', icon: <IndianRupee className="w-4 h-4" />, module: 'fees', action: 'add' },
  { label: 'Notices', path: '/communication/notices', icon: <Bell className="w-4 h-4" />, module: 'communication' },
  { label: 'Bus Tracker', path: '/transport', icon: <Bus className="w-4 h-4" />, module: 'transport' },
  { label: 'Certificates', path: '/frontoffice/certificates', icon: <Award className="w-4 h-4" />, module: 'certificates' },
  { label: 'Events', path: '/events', icon: <Calendar className="w-4 h-4" />, module: 'events' },
];

export const STUDENT_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Profile', path: '/students', icon: <GraduationCap className="w-4 h-4" />, module: 'students' },
  { label: 'Attendance', path: '/attendance', icon: <UserCheckIcon />, module: 'attendance' },
  { label: 'Homework', path: '/homework', icon: <ClipboardList className="w-4 h-4" />, module: 'homework' },
  { label: 'Study Material', path: '/study-material', icon: <BookOpen className="w-4 h-4" />, module: 'study_material' },
  { label: 'Timetable', path: '/academics/timetable', icon: <Clock className="w-4 h-4" />, module: 'timetable' },
  { label: 'Marks & Results', path: '/exams/report-cards', icon: <Award className="w-4 h-4" />, module: 'examinations' },
  { label: 'Notices', path: '/communication/notices', icon: <Bell className="w-4 h-4" />, module: 'communication' },
  { label: 'Library', path: '/library', icon: <Library className="w-4 h-4" />, module: 'library' },
  { label: 'Events', path: '/events', icon: <Calendar className="w-4 h-4" />, module: 'events' },
];

export const TEACHER_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Timetable', path: '/academics/timetable', icon: <Clock className="w-4 h-4" />, module: 'timetable' },
  { label: 'Attendance', path: '/attendance', icon: <UserCheckIcon />, module: 'attendance', action: 'add' },
  { label: 'Marks Entry', path: '/exams/marks', icon: <BookOpen className="w-4 h-4" />, module: 'examinations', action: 'add' },
  { label: 'Exam Schedule', path: '/exams', icon: <Calendar className="w-4 h-4" />, module: 'examinations' },
  { label: 'Homework', path: '/homework', icon: <ClipboardList className="w-4 h-4" />, module: 'homework' },
  { label: 'Study Material', path: '/study-material', icon: <BookOpen className="w-4 h-4" />, module: 'study_material' },
  { label: 'Notices', path: '/communication/notices', icon: <Bell className="w-4 h-4" />, module: 'communication' },
];

export const CLASS_TEACHER_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Class', path: '/students', icon: <Users className="w-4 h-4" />, module: 'students' },
  { label: 'Attendance', path: '/attendance', icon: <UserCheckIcon />, module: 'attendance', action: 'add' },
  { label: 'Homework', path: '/homework', icon: <ClipboardList className="w-4 h-4" />, module: 'homework' },
  { label: 'Report Cards', path: '/exams/report-cards', icon: <Award className="w-4 h-4" />, module: 'examinations' },
  { label: 'Timetable', path: '/academics/timetable', icon: <Clock className="w-4 h-4" />, module: 'timetable' },
  { label: 'Fee Defaulters', path: '/fees/defaulters', icon: <Bell className="w-4 h-4" />, module: 'fees' },
  { label: 'Notices', path: '/communication/notices', icon: <Bell className="w-4 h-4" />, module: 'communication' },
  { label: 'Certificates', path: '/frontoffice/certificates', icon: <Award className="w-4 h-4" />, module: 'certificates', action: 'add' },
];

export const CASHIER_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Fee Collection', path: '/fees/payments', icon: <IndianRupee className="w-4 h-4" />, module: 'fees', action: 'add' },
];

export const DRIVER_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Route', path: '/transport', icon: <Bus className="w-4 h-4" />, module: 'transport' },
];

export const RECEPTIONIST_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Visitors', path: '/frontoffice/visitors', icon: <Users className="w-4 h-4" />, module: 'visitor_management' },
  { label: 'Enquiries', path: '/admissions/enquiries', icon: <MessageSquare className="w-4 h-4" />, module: 'admissions', action: 'add' },
  { label: 'Student Lookup', path: '/students', icon: <GraduationCap className="w-4 h-4" />, module: 'students' },
];

export const LIBRARIAN_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Library', path: '/library', icon: <Library className="w-4 h-4" />, module: 'library' },
  { label: 'Students', path: '/students', icon: <Users className="w-4 h-4" />, module: 'students' },
  { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, module: 'reports' },
];

export const ACCOUNTANT_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  {
    label: 'Fee Management', icon: <IndianRupee className="w-4 h-4" />, module: 'fees',
    children: [
      { label: 'Fee Structures', path: '/fees/structures', icon: <FileText className="w-4 h-4" />, module: 'fees', action: 'edit' },
      { label: 'Fee Demands', path: '/fees/demands', icon: <ReceiptIcon />, module: 'fees', action: 'edit' },
      { label: 'Collections', path: '/fees/payments', icon: <IndianRupee className="w-4 h-4" />, module: 'fees', action: 'add' },
      { label: 'Concessions', path: '/fees/concessions', icon: <Award className="w-4 h-4" />, module: 'fees', action: 'approve' },
      { label: 'Defaulters', path: '/fees/defaulters', icon: <Bell className="w-4 h-4" />, module: 'fees' },
    ],
  },
  { label: 'Expenses', path: '/finance/expenses', icon: <DollarSign className="w-4 h-4" />, module: 'expenses' },
  {
    label: 'Payroll', icon: <UserCog className="w-4 h-4" />, module: 'payroll',
    children: [
      { label: 'Payroll', path: '/hr/payroll', icon: <IndianRupee className="w-4 h-4" />, module: 'payroll' },
      { label: 'Salary Slips', path: '/hr/salary-slips', icon: <FileText className="w-4 h-4" />, module: 'payroll' },
    ],
  },
  { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, module: 'reports' },
];

export const HR_MANAGER_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Staff', path: '/hr/staff', icon: <Users className="w-4 h-4" />, module: 'hr' },
  { label: 'Leaves', path: '/hr/leaves', icon: <Calendar className="w-4 h-4" />, module: 'hr' },
  { label: 'Payroll', path: '/hr/payroll', icon: <IndianRupee className="w-4 h-4" />, module: 'payroll' },
  { label: 'Approvals', path: '/approvals', icon: <Clock className="w-4 h-4" />, module: 'tasks' },
  { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, module: 'reports' },
];

export const TRANSPORT_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Transport', path: '/transport', icon: <Bus className="w-4 h-4" />, module: 'transport' },
  { label: 'Students', path: '/students', icon: <Users className="w-4 h-4" />, module: 'students' },
  { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, module: 'reports' },
];

export const HOSTEL_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Hostel', path: '/hostel', icon: <Home className="w-4 h-4" />, module: 'hostel' },
  { label: 'Students', path: '/students', icon: <Users className="w-4 h-4" />, module: 'students' },
  { label: 'Visitors', path: '/frontoffice/visitors', icon: <Users className="w-4 h-4" />, module: 'visitor_management' },
];

export const ADMISSION_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  {
    label: 'Admissions', icon: <UserPlus className="w-4 h-4" />, module: 'admissions',
    children: [
      { label: 'Enquiries', path: '/admissions/enquiries', icon: <MessageSquare className="w-4 h-4" />, module: 'admissions' },
      { label: 'Online Admission', path: '/admissions/form', icon: <FileText className="w-4 h-4" />, module: 'admissions' },
      { label: 'RTE Tracker', path: '/admissions/rte', icon: <ShieldCheck className="w-4 h-4" />, module: 'admissions' },
    ],
  },
  { label: 'Students', path: '/students', icon: <GraduationCap className="w-4 h-4" />, module: 'students', action: 'add' },
  { label: 'Certificates', path: '/frontoffice/certificates', icon: <Award className="w-4 h-4" />, module: 'certificates', action: 'add' },
];

export const STAFF_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Leave', path: '/hr/leaves', icon: <Calendar className="w-4 h-4" />, module: 'hr', action: 'add' },
  { label: 'Notices', path: '/communication/notices', icon: <Bell className="w-4 h-4" />, module: 'communication' },
  { label: 'Events', path: '/events', icon: <Calendar className="w-4 h-4" />, module: 'events' },
  { label: 'Health Records', path: '/health', icon: <Stethoscope className="w-4 h-4" />, module: 'students', action: 'edit' },
];

// ─── Full admin menu (Principal, VP, HoD) — action-gated sub-items ───────────

export const ADMIN_PORTAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },

  {
    label: 'Admissions', icon: <UserPlus className="w-4 h-4" />, module: 'admissions',
    children: [
      { label: 'Enquiries', path: '/admissions/enquiries', icon: <MessageSquare className="w-4 h-4" />, module: 'admissions' },
      { label: 'Online Admission', path: '/admissions/form', icon: <FileText className="w-4 h-4" />, module: 'admissions' },
      { label: 'RTE Tracker', path: '/admissions/rte', icon: <ShieldCheck className="w-4 h-4" />, module: 'admissions' },
    ],
  },

  {
    label: 'Students', icon: <GraduationCap className="w-4 h-4" />, module: 'students',
    children: [
      { label: 'All Students', path: '/students', icon: <Users className="w-4 h-4" />, module: 'students' },
      { label: 'Documents', path: '/students/documents', icon: <FileText className="w-4 h-4" />, module: 'students', action: 'edit' },
      { label: 'ID Cards', path: '/students/id-cards', icon: <Award className="w-4 h-4" />, module: 'students', action: 'edit' },
    ],
  },

  {
    label: 'Academics', icon: <School className="w-4 h-4" />, module: 'academics',
    children: [
      { label: 'Academic Years', path: '/academics/years', icon: <Calendar className="w-4 h-4" />, module: 'academics', action: 'edit' },
      { label: 'Classes & Divisions', path: '/academics/standards', icon: <Building2 className="w-4 h-4" />, module: 'academics', action: 'edit' },
      { label: 'Subjects', path: '/academics/subjects', icon: <BookOpen className="w-4 h-4" />, module: 'academics', action: 'edit' },
      { label: 'Timetable', path: '/academics/timetable', icon: <Clock className="w-4 h-4" />, module: 'timetable' },
      { label: 'Syllabus', path: '/academics/syllabus', icon: <BookOpen className="w-4 h-4" />, module: 'study_material' },
    ],
  },

  { label: 'Attendance', path: '/attendance', icon: <UserCheckIcon />, module: 'attendance' },

  {
    label: 'Homework', icon: <ClipboardList className="w-4 h-4" />, module: 'homework',
    children: [
      { label: 'Homework', path: '/homework', icon: <ClipboardList className="w-4 h-4" />, module: 'homework' },
      { label: 'Study Material', path: '/study-material', icon: <BookOpen className="w-4 h-4" />, module: 'study_material' },
    ],
  },

  {
    label: 'Fee Management', icon: <IndianRupee className="w-4 h-4" />, module: 'fees',
    children: [
      { label: 'Fee Structures', path: '/fees/structures', icon: <FileText className="w-4 h-4" />, module: 'fees', action: 'edit' },
      { label: 'Fee Demands', path: '/fees/demands', icon: <ReceiptIcon />, module: 'fees', action: 'edit' },
      { label: 'Collections', path: '/fees/payments', icon: <IndianRupee className="w-4 h-4" />, module: 'fees', action: 'add' },
      { label: 'Concessions', path: '/fees/concessions', icon: <Award className="w-4 h-4" />, module: 'fees', action: 'approve' },
      { label: 'Defaulters', path: '/fees/defaulters', icon: <Bell className="w-4 h-4" />, module: 'fees' },
    ],
  },

  {
    label: 'Exams & Results', icon: <ClipboardList className="w-4 h-4" />, module: 'examinations',
    children: [
      { label: 'Exam Schedule', path: '/exams', icon: <Calendar className="w-4 h-4" />, module: 'examinations' },
      { label: 'Marks Entry', path: '/exams/marks', icon: <BookOpen className="w-4 h-4" />, module: 'examinations', action: 'add' },
      { label: 'Report Cards', path: '/exams/report-cards', icon: <Award className="w-4 h-4" />, module: 'examinations' },
      { label: 'Analytics', path: '/exams/analytics', icon: <BarChart3 className="w-4 h-4" />, module: 'examinations', action: 'export' },
    ],
  },

  {
    label: 'HR & Payroll', icon: <UserCog className="w-4 h-4" />, module: 'hr',
    children: [
      { label: 'Staff', path: '/hr/staff', icon: <Users className="w-4 h-4" />, module: 'hr' },
      { label: 'Leaves', path: '/hr/leaves', icon: <Calendar className="w-4 h-4" />, module: 'hr' },
      { label: 'Payroll', path: '/hr/payroll', icon: <IndianRupee className="w-4 h-4" />, module: 'payroll' },
      { label: 'Salary Slips', path: '/hr/salary-slips', icon: <FileText className="w-4 h-4" />, module: 'payroll' },
    ],
  },

  { label: 'Library', path: '/library', icon: <Library className="w-4 h-4" />, module: 'library' },
  { label: 'Transport', path: '/transport', icon: <Bus className="w-4 h-4" />, module: 'transport' },
  { label: 'Hostel', path: '/hostel', icon: <Home className="w-4 h-4" />, module: 'hostel' },
  { label: 'Health Records', path: '/health', icon: <Stethoscope className="w-4 h-4" />, module: 'students', action: 'edit' },
  { label: 'Inventory', path: '/inventory', icon: <Warehouse className="w-4 h-4" />, module: 'inventory' },
  { label: 'Expenses', path: '/finance/expenses', icon: <DollarSign className="w-4 h-4" />, module: 'expenses' },

  {
    label: 'Communication', icon: <Bell className="w-4 h-4" />, module: 'communication',
    children: [
      { label: 'Notice Board', path: '/communication/notices', icon: <Bell className="w-4 h-4" />, module: 'communication' },
      { label: 'SMS & WhatsApp', path: '/communication/sms', icon: <MessageSquare className="w-4 h-4" />, module: 'communication', action: 'edit' },
    ],
  },

  {
    label: 'Front Office', icon: <ShieldCheck className="w-4 h-4" />,
    children: [
      { label: 'Visitors', path: '/frontoffice/visitors', icon: <Users className="w-4 h-4" />, module: 'visitor_management' },
      { label: 'Certificates', path: '/frontoffice/certificates', icon: <Award className="w-4 h-4" />, module: 'certificates' },
    ],
  },

  { label: 'Events & Calendar', path: '/events', icon: <Calendar className="w-4 h-4" />, module: 'events' },
  { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, module: 'reports' },
  { label: 'Approvals', path: '/approvals', icon: <Clock className="w-4 h-4" />, module: 'tasks' },

  {
    label: 'Settings', icon: <Settings className="w-4 h-4" />, module: 'settings',
    children: [
      { label: 'School Profile', path: '/settings/school', icon: <School className="w-4 h-4" />, module: 'settings' },
      { label: 'Roles & Permissions', path: '/settings/roles', icon: <Shield className="w-4 h-4" />, module: 'role_management' },
      { label: 'Users', path: '/settings/users', icon: <Users className="w-4 h-4" />, module: 'role_management' },
      { label: 'Modules', path: '/settings/modules', icon: <Package className="w-4 h-4" />, module: 'settings', action: 'edit' },
    ],
  },

  { label: 'Audit Logs', path: '/audit-logs', icon: <ScrollText className="w-4 h-4" />, module: 'audit_logs' },
  { label: 'All Schools', path: '/superadmin/tenants', icon: <Building2 className="w-4 h-4" />, superAdminOnly: true },
];

export type PortalType =
  | 'super_admin' | 'parent' | 'student' | 'teacher' | 'class_teacher'
  | 'cashier' | 'driver' | 'receptionist' | 'librarian' | 'accountant'
  | 'hr_manager' | 'transport_incharge' | 'hostel_warden' | 'admission_officer'
  | 'staff' | 'admin';

export function getPortalType(role?: string): PortalType {
  switch (role) {
    case 'super_admin': return 'super_admin';
    case 'parent': return 'parent';
    case 'student': return 'student';
    case 'teacher': return 'teacher';
    case 'class_teacher': return 'class_teacher';
    case 'cashier': return 'cashier';
    case 'driver': return 'driver';
    case 'receptionist': return 'receptionist';
    case 'librarian': return 'librarian';
    case 'accountant': return 'accountant';
    case 'hr_manager': return 'hr_manager';
    case 'transport_incharge': return 'transport_incharge';
    case 'hostel_warden': return 'hostel_warden';
    case 'admission_officer': return 'admission_officer';
    case 'staff': return 'staff';
    default: return 'admin';
  }
}

export function getNavForRole(role?: string): NavItem[] {
  switch (getPortalType(role)) {
    case 'super_admin':
      return [
        { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
        { label: 'All Schools', path: '/superadmin/tenants', icon: <Building2 className="w-4 h-4" /> },
        { label: 'Audit Logs', path: '/audit-logs', icon: <ScrollText className="w-4 h-4" />, module: 'audit_logs' },
      ];
    case 'parent': return PARENT_PORTAL_NAV;
    case 'student': return STUDENT_PORTAL_NAV;
    case 'teacher': return TEACHER_PORTAL_NAV;
    case 'class_teacher': return CLASS_TEACHER_PORTAL_NAV;
    case 'cashier': return CASHIER_PORTAL_NAV;
    case 'driver': return DRIVER_PORTAL_NAV;
    case 'receptionist': return RECEPTIONIST_PORTAL_NAV;
    case 'librarian': return LIBRARIAN_PORTAL_NAV;
    case 'accountant': return ACCOUNTANT_PORTAL_NAV;
    case 'hr_manager': return HR_MANAGER_PORTAL_NAV;
    case 'transport_incharge': return TRANSPORT_PORTAL_NAV;
    case 'hostel_warden': return HOSTEL_PORTAL_NAV;
    case 'admission_officer': return ADMISSION_PORTAL_NAV;
    case 'staff': return STAFF_PORTAL_NAV;
    default: return ADMIN_PORTAL_NAV;
  }
}

// Small icon helpers to avoid duplicate imports in every line
function UserCheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}
