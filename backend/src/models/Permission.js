const mongoose = require('mongoose');

/**
 * RBAC Permission Matrix — stored in DB per role × module
 * Actions: view | add | edit | delete | approve | export
 * Scopes: branchScope | dataScope | studentScope
 *
 * Source: RBAC_Permission_Architecture_Plan.md — Section 3
 */
const permissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: [
      'super_admin', 'principal', 'vice_principal', 'hod', 'class_teacher', 'teacher',
      'accountant', 'cashier', 'hr_manager', 'admission_officer', 'librarian',
      'transport_incharge', 'hostel_warden', 'receptionist', 'driver',
      'parent', 'student', 'staff',
    ],
  },
  module: {
    type: String,
    required: true,
    enum: [
      'admissions', 'students', 'attendance', 'academics', 'timetable',
      'examinations', 'homework', 'study_material', 'communication',
      'fees', 'payroll', 'hr', 'transport', 'hostel', 'library',
      'inventory', 'expenses', 'certificates', 'events', 'visitor_management',
      'tasks', 'reports', 'settings', 'role_management', 'audit_logs', 'dashboard',
      'discipline', 'health', 'alumni',
    ],
  },
  // Action flags
  canView: { type: Boolean, default: false },
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  canApprove: { type: Boolean, default: false },
  canExport: { type: Boolean, default: false },

  // Scope dimensions
  branchScope: {
    type: String,
    enum: ['all_branches', 'own_branch', 'assigned_branches', 'none'],
    default: 'own_branch',
  },
  dataScope: {
    type: String,
    enum: ['group', 'school', 'department', 'division', 'own', 'none'],
    default: 'school',
  },
  studentScope: {
    type: String,
    enum: ['all', 'assigned_students', 'own_children', 'own', 'none'],
    default: 'all',
  },
}, { timestamps: true });

permissionSchema.index({ role: 1, module: 1 }, { unique: true });
module.exports = mongoose.model('Permission', permissionSchema);
