const Role = require('../models/Role');

/**
 * All module slugs with their default permissions per system role.
 * Format: { module: [...actions] }
 */
const SYSTEM_ROLES = [
  {
    name: 'Principal',
    slug: 'principal',
    description: 'Full access to all school operations',
    permissions: [
      { module: 'admissions', actions: ['view','create','edit','delete','export','approve'] },
      { module: 'students', actions: ['view','create','edit','delete','export'] },
      { module: 'academics', actions: ['view','create','edit','delete','export'] },
      { module: 'attendance', actions: ['view','create','edit','export','approve'] },
      { module: 'fees', actions: ['view','create','edit','delete','export','approve'] },
      { module: 'exams', actions: ['view','create','edit','delete','export','approve'] },
      { module: 'homework', actions: ['view','create','edit','delete'] },
      { module: 'communication', actions: ['view','create','edit','delete'] },
      { module: 'transport', actions: ['view','create','edit','delete','export'] },
      { module: 'hostel', actions: ['view','create','edit','delete','export'] },
      { module: 'library', actions: ['view','create','edit','delete','export'] },
      { module: 'hr', actions: ['view','create','edit','delete','export','approve'] },
      { module: 'payroll', actions: ['view','create','edit','export','approve'] },
      { module: 'discipline', actions: ['view','create','edit','delete','export'] },
      { module: 'health', actions: ['view','create','edit','export'] },
      { module: 'events', actions: ['view','create','edit','delete','export'] },
      { module: 'inventory', actions: ['view','create','edit','delete','export','approve'] },
      { module: 'expense', actions: ['view','create','edit','delete','export','approve'] },
      { module: 'visitors', actions: ['view','create','edit','export'] },
      { module: 'certificates', actions: ['view','create','edit','delete','export'] },
      { module: 'reports', actions: ['view','export'] },
    ],
  },
  {
    name: 'Vice Principal',
    slug: 'vice_principal',
    description: 'Academic and student management',
    permissions: [
      { module: 'students', actions: ['view','edit','export'] },
      { module: 'academics', actions: ['view','create','edit','export'] },
      { module: 'attendance', actions: ['view','create','edit','export'] },
      { module: 'exams', actions: ['view','create','edit','export','approve'] },
      { module: 'homework', actions: ['view','create','edit'] },
      { module: 'communication', actions: ['view','create'] },
      { module: 'hr', actions: ['view','export'] },
      { module: 'reports', actions: ['view','export'] },
    ],
  },
  {
    name: 'Class Teacher',
    slug: 'class_teacher',
    description: 'Manages own class attendance, homework, parents',
    permissions: [
      { module: 'students', actions: ['view','edit'] },
      { module: 'attendance', actions: ['view','create','edit'] },
      { module: 'homework', actions: ['view','create','edit','delete'] },
      { module: 'communication', actions: ['view','create'] },
      { module: 'exams', actions: ['view','create'] },
      { module: 'reports', actions: ['view'] },
    ],
  },
  {
    name: 'Subject Teacher',
    slug: 'teacher',
    description: 'Marks entry, classwork, homework',
    permissions: [
      { module: 'students', actions: ['view'] },
      { module: 'attendance', actions: ['view','create'] },
      { module: 'homework', actions: ['view','create','edit','delete'] },
      { module: 'exams', actions: ['view','create'] },
      { module: 'academics', actions: ['view'] },
    ],
  },
  {
    name: 'Admission Officer',
    slug: 'admission_officer',
    description: 'Manages enquiries and admissions',
    permissions: [
      { module: 'admissions', actions: ['view','create','edit','export'] },
      { module: 'students', actions: ['view','create','edit','export'] },
      { module: 'communication', actions: ['view','create'] },
      { module: 'reports', actions: ['view','export'] },
    ],
  },
  {
    name: 'Accountant',
    slug: 'accountant',
    description: 'Fee collection, payroll, expenses',
    permissions: [
      { module: 'fees', actions: ['view','create','edit','export'] },
      { module: 'payroll', actions: ['view','create','edit','export'] },
      { module: 'expense', actions: ['view','create','edit','export'] },
      { module: 'students', actions: ['view'] },
      { module: 'reports', actions: ['view','export'] },
    ],
  },
  {
    name: 'Librarian',
    slug: 'librarian',
    description: 'Book management, issue and return',
    permissions: [
      { module: 'library', actions: ['view','create','edit','delete','export'] },
      { module: 'students', actions: ['view'] },
    ],
  },
  {
    name: 'Transport In-charge',
    slug: 'transport_incharge',
    description: 'Manages vehicles, routes, allocations',
    permissions: [
      { module: 'transport', actions: ['view','create','edit','delete','export'] },
      { module: 'students', actions: ['view'] },
    ],
  },
  {
    name: 'Hostel Warden',
    slug: 'hostel_warden',
    description: 'Room allocation, hostel attendance, mess',
    permissions: [
      { module: 'hostel', actions: ['view','create','edit','export'] },
      { module: 'students', actions: ['view'] },
      { module: 'communication', actions: ['view','create'] },
    ],
  },
  {
    name: 'HR Manager',
    slug: 'hr_manager',
    description: 'Staff records, leaves, payroll',
    permissions: [
      { module: 'hr', actions: ['view','create','edit','export','approve'] },
      { module: 'payroll', actions: ['view','create','edit','export','approve'] },
      { module: 'attendance', actions: ['view','export'] },
    ],
  },
  {
    name: 'Receptionist',
    slug: 'receptionist',
    description: 'Visitors, gate passes, phone calls',
    permissions: [
      { module: 'visitors', actions: ['view','create','edit'] },
      { module: 'admissions', actions: ['view','create'] },
      { module: 'communication', actions: ['view','create'] },
    ],
  },
  {
    name: 'Parent',
    slug: 'parent',
    description: "View child's academics, fees, attendance",
    permissions: [
      { module: 'students', actions: ['view'] },
      { module: 'attendance', actions: ['view'] },
      { module: 'fees', actions: ['view','create'] }, // can pay
      { module: 'homework', actions: ['view'] },
      { module: 'exams', actions: ['view'] },
      { module: 'communication', actions: ['view','create'] },
      { module: 'transport', actions: ['view'] },
    ],
  },
  {
    name: 'Student',
    slug: 'student',
    description: 'View own timetable, homework, marks',
    permissions: [
      { module: 'academics', actions: ['view'] },
      { module: 'homework', actions: ['view'] },
      { module: 'exams', actions: ['view'] },
      { module: 'library', actions: ['view'] },
      { module: 'communication', actions: ['view'] },
      { module: 'events', actions: ['view'] },
    ],
  },
];

async function seedSystemRoles(tenantId) {
  for (const roleData of SYSTEM_ROLES) {
    const exists = await Role.findOne({ tenantId, slug: roleData.slug, deletedAt: null });
    if (!exists) {
      await Role.create({ ...roleData, tenantId, isSystem: true });
    }
  }
}

module.exports = { seedSystemRoles, SYSTEM_ROLES };
