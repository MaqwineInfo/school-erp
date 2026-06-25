/**
 * Seed RBAC Permission Matrix
 * Source: RBAC_Permission_Architecture_Plan.md — Section 3 (All Groups A–F)
 *
 * Run: node src/scripts/seed-permissions.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// ─── Permission builder ───────────────────────────────────────────────────────
const P = (canView, canAdd, canEdit, canDelete, canApprove, canExport, branchScope = 'own_branch', dataScope = 'school', studentScope = 'all') =>
  ({ canView, canAdd, canEdit, canDelete, canApprove, canExport, branchScope, dataScope, studentScope });

const NONE = P(false, false, false, false, false, false, 'none', 'none', 'none');
const VIEW = (ds = 'school', ss = 'all') => P(true, false, false, false, false, false, 'own_branch', ds, ss);
const FULL = (ds = 'school', ss = 'all') => P(true, true, true, true, false, true, 'own_branch', ds, ss);
const FULL_APPROVE = (ds = 'school', ss = 'all') => P(true, true, true, true, true, true, 'own_branch', ds, ss);
const VIEW_APPROVE = (ds = 'school', ss = 'all') => P(true, false, false, false, true, true, 'own_branch', ds, ss);
const OWN_FULL = P(true, true, true, true, false, true, 'own_branch', 'own', 'own');
const OWN_VIEW = P(true, false, false, false, false, false, 'own_branch', 'own', 'own');

/**
 * FULL PERMISSION MATRIX
 * Based on Sections 3A–3F of RBAC_Permission_Architecture_Plan.md
 *
 * Format: { role: { module: permissionObject } }
 */
const MATRIX = {

  // ─────────────────────────────────────────────────────────────────────────
  // SUPER ADMIN — Full platform access except student PII
  // ─────────────────────────────────────────────────────────────────────────
  super_admin: {
    admissions:         P(true, true, true, true, true, true, 'all_branches', 'group', 'all'),
    students:           P(false, false, false, true, false, false, 'all_branches', 'group', 'none'), // PII blocked except delete
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, true, true, false, true, 'all_branches', 'group', 'none'),
    fees:               NONE,
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       NONE,
    events:             NONE,
    visitor_management: NONE,
    tasks:              NONE,
    reports:            P(true, false, false, false, false, true, 'all_branches', 'group', 'none'),
    settings:           P(true, true, true, true, false, true, 'all_branches', 'group', 'none'),
    role_management:    P(true, true, true, true, false, false, 'all_branches', 'group', 'none'),
    audit_logs:         P(true, false, false, false, false, true, 'all_branches', 'group', 'none'),
    dashboard:          P(true, false, false, false, false, false, 'all_branches', 'group', 'none'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRINCIPAL — Full branch authority
  // ─────────────────────────────────────────────────────────────────────────
  principal: {
    admissions:         FULL_APPROVE(),
    students:           FULL_APPROVE(),
    attendance:         FULL_APPROVE(),
    academics:          FULL_APPROVE(),
    timetable:          FULL_APPROVE(),
    examinations:       VIEW_APPROVE(),
    homework:           VIEW(),
    study_material:     VIEW(),
    communication:      FULL_APPROVE(),
    fees:               FULL_APPROVE(),
    payroll:            VIEW_APPROVE(),
    hr:                 FULL_APPROVE(),
    transport:          FULL_APPROVE(),
    hostel:             FULL_APPROVE(),
    library:            FULL_APPROVE(),
    inventory:          VIEW_APPROVE(),
    expenses:           VIEW_APPROVE(),
    certificates:       FULL_APPROVE(),
    events:             FULL_APPROVE(),
    visitor_management: FULL_APPROVE(),
    tasks:              FULL_APPROVE(),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           FULL('school'),
    role_management:    FULL('school'),
    audit_logs:         VIEW(),
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VICE PRINCIPAL — Academic oversight
  // ─────────────────────────────────────────────────────────────────────────
  vice_principal: {
    admissions:         VIEW(),
    students:           VIEW(),
    attendance:         P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    academics:          FULL_APPROVE(),
    timetable:          FULL_APPROVE(),
    examinations:       FULL('school'),
    homework:           VIEW(),
    study_material:     VIEW(),
    communication:      FULL('school'),
    fees:               NONE,
    payroll:            NONE,
    hr:                 VIEW(),
    transport:          VIEW(),
    hostel:             VIEW(),
    library:            VIEW(),
    inventory:          NONE,
    expenses:           NONE,
    certificates:       VIEW(),
    events:             FULL('school'),
    visitor_management: VIEW(),
    tasks:              FULL('school'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HoD — Department scope
  // ─────────────────────────────────────────────────────────────────────────
  hod: {
    admissions:         NONE,
    students:           VIEW('department', 'assigned_students'),
    attendance:         VIEW('department', 'assigned_students'),
    academics:          FULL('department'),
    timetable:          VIEW('department'),
    examinations:       P(true, false, false, false, true, true, 'own_branch', 'department', 'assigned_students'), // verify marks
    homework:           P(true, false, false, false, false, true, 'own_branch', 'department', 'assigned_students'),
    study_material:     FULL('department', 'assigned_students'),
    communication:      FULL('department'),
    fees:               NONE,
    payroll:            NONE,
    hr:                 VIEW('department'), // leave recommendations
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          P(false, true, false, false, false, false, 'own_branch', 'department', 'none'), // indent request
    expenses:           NONE,
    certificates:       NONE,
    events:             VIEW(),
    visitor_management: NONE,
    tasks:              FULL('department'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'department', 'assigned_students'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'department', 'assigned_students'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CLASS TEACHER — Own division
  // ─────────────────────────────────────────────────────────────────────────
  class_teacher: {
    admissions:         NONE,
    students:           P(true, false, true, false, false, false, 'own_branch', 'division', 'assigned_students'), // limited edit (remarks only)
    attendance:         FULL('division', 'assigned_students'),
    academics:          VIEW('division'),
    timetable:          VIEW('division'),
    examinations:       VIEW('division', 'assigned_students'),
    homework:           P(true, true, true, true, false, false, 'own_branch', 'division', 'assigned_students'),
    study_material:     VIEW('division'),
    communication:      FULL('division', 'assigned_students'),
    fees:               VIEW('division', 'assigned_students'), // defaulters list
    payroll:            NONE,
    hr:                 NONE,
    transport:          VIEW('division', 'assigned_students'),
    hostel:             VIEW('division', 'assigned_students'),
    library:            VIEW('division', 'assigned_students'),
    inventory:          NONE,
    expenses:           NONE,
    certificates:       P(false, true, false, false, false, false, 'own_branch', 'division', 'assigned_students'), // initiate TC
    events:             VIEW(),
    visitor_management: NONE,
    tasks:              FULL('division'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'division', 'assigned_students'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'division', 'assigned_students'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TEACHER (Subject Teacher) — Own subjects/classes
  // ─────────────────────────────────────────────────────────────────────────
  teacher: {
    admissions:         NONE,
    students:           VIEW('own', 'assigned_students'),
    attendance:         P(true, true, true, false, false, false, 'own_branch', 'own', 'assigned_students'), // period-wise
    academics:          FULL('own'),
    timetable:          VIEW('own'),
    examinations:       P(true, true, true, false, false, false, 'own_branch', 'own', 'assigned_students'), // marks entry
    homework:           FULL('own', 'assigned_students'),
    study_material:     FULL('own', 'assigned_students'),
    communication:      P(true, true, false, false, false, false, 'own_branch', 'own', 'assigned_students'),
    fees:               NONE,
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       NONE,
    events:             VIEW(),
    visitor_management: NONE,
    tasks:              FULL('own'),
    reports:            P(true, false, false, false, false, false, 'own_branch', 'own', 'assigned_students'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'assigned_students'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACCOUNTANT — Financial operations
  // ─────────────────────────────────────────────────────────────────────────
  accountant: {
    admissions:         NONE,
    students:           VIEW('school', 'all'), // fee status only
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, false, false, false, false, 'own_branch', 'school', 'all'), // fee reminders
    fees:               FULL_APPROVE(),
    payroll:            P(true, true, true, false, false, true, 'own_branch', 'school', 'none'), // prepare + view
    hr:                 VIEW(),
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          VIEW(), // purchase orders view
    expenses:           FULL_APPROVE(),
    certificates:       NONE,
    events:             NONE,
    visitor_management: NONE,
    tasks:              NONE,
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CASHIER — Counter fee collection only
  // ─────────────────────────────────────────────────────────────────────────
  cashier: {
    admissions:         NONE,
    students:           P(true, false, false, false, false, false, 'own_branch', 'own', 'all'), // view fee status
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      NONE,
    fees:               P(true, true, false, false, false, false, 'own_branch', 'own', 'all'), // collect + receipt
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       NONE,
    events:             NONE,
    visitor_management: NONE,
    tasks:              NONE,
    reports:            NONE,
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HR MANAGER — Staff lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  hr_manager: {
    admissions:         NONE,
    students:           NONE,
    attendance:         P(true, true, true, false, false, true, 'own_branch', 'school', 'none'), // staff attendance
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, false, false, false, false, 'own_branch', 'school', 'none'), // staff notices
    fees:               NONE,
    payroll:            P(true, true, true, false, false, true, 'own_branch', 'school', 'none'),
    hr:                 FULL_APPROVE(),
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       NONE,
    events:             NONE,
    visitor_management: NONE,
    tasks:              FULL('school'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'none'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'none'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADMISSION OFFICER — Enquiry to admission
  // ─────────────────────────────────────────────────────────────────────────
  admission_officer: {
    admissions:         FULL_APPROVE(),
    students:           P(true, true, false, false, false, true, 'own_branch', 'school', 'all'), // create on admission
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, false, false, false, false, 'own_branch', 'school', 'all'),
    fees:               VIEW(), // fee structure + quotation
    payroll:            NONE,
    hr:                 NONE,
    transport:          VIEW(),
    hostel:             VIEW(),
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       P(false, true, false, false, false, false, 'own_branch', 'school', 'all'), // admission letter
    events:             NONE,
    visitor_management: NONE,
    tasks:              FULL('school'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LIBRARIAN — Library only
  // ─────────────────────────────────────────────────────────────────────────
  librarian: {
    admissions:         NONE,
    students:           VIEW('school', 'all'), // borrowing info
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, false, false, false, false, 'own_branch', 'school', 'all'),
    fees:               NONE,
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             NONE,
    library:            FULL_APPROVE(),
    inventory:          NONE,
    expenses:           NONE,
    certificates:       NONE,
    events:             NONE,
    visitor_management: NONE,
    tasks:              NONE,
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSPORT INCHARGE
  // ─────────────────────────────────────────────────────────────────────────
  transport_incharge: {
    admissions:         NONE,
    students:           VIEW('school', 'all'), // transport allocation
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, false, false, false, false, 'own_branch', 'school', 'all'),
    fees:               NONE,
    payroll:            NONE,
    hr:                 NONE,
    transport:          FULL_APPROVE(),
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           VIEW(), // transport expenses
    certificates:       NONE,
    events:             NONE,
    visitor_management: NONE,
    tasks:              FULL('school'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HOSTEL WARDEN
  // ─────────────────────────────────────────────────────────────────────────
  hostel_warden: {
    admissions:         NONE,
    students:           VIEW('school', 'all'), // hostel profile
    attendance:         P(true, true, true, false, false, true, 'own_branch', 'school', 'all'), // hostel attendance
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(true, true, false, false, false, false, 'own_branch', 'school', 'all'),
    fees:               VIEW(), // hostel fees
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             FULL_APPROVE(),
    library:            NONE,
    inventory:          NONE,
    expenses:           VIEW(),
    certificates:       NONE,
    events:             NONE,
    visitor_management: P(true, true, true, false, false, false, 'own_branch', 'school', 'all'), // hostel visitors
    tasks:              FULL('school'),
    reports:            P(true, false, false, false, false, true, 'own_branch', 'school', 'all'),
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'school', 'all'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RECEPTIONIST — Front-desk only
  // ─────────────────────────────────────────────────────────────────────────
  receptionist: {
    admissions:         P(false, true, false, false, false, false, 'own_branch', 'own', 'none'), // enquiry create
    students:           P(true, false, false, false, false, false, 'own_branch', 'own', 'all'), // name/class/photo
    attendance:         NONE,
    academics:          NONE,
    timetable:          NONE,
    examinations:       NONE,
    homework:           NONE,
    study_material:     NONE,
    communication:      P(false, true, false, false, false, false, 'own_branch', 'own', 'none'), // send individual
    fees:               NONE,
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       NONE,
    events:             NONE,
    visitor_management: P(true, true, true, false, false, false, 'own_branch', 'own', 'none'),
    tasks:              P(true, true, false, false, false, false, 'own_branch', 'own', 'none'),
    reports:            NONE,
    settings:           NONE,
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'none'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER — Route only (mobile app)
  // ─────────────────────────────────────────────────────────────────────────
  driver: {
    admissions:         NONE, students: NONE, attendance: NONE, academics: NONE,
    timetable:          NONE, examinations: NONE, homework: NONE, study_material: NONE,
    communication:      NONE, fees: NONE, payroll: NONE, hr: NONE,
    transport:          P(true, true, false, false, false, false, 'own_branch', 'own', 'none'), // own route
    hostel:             NONE, library: NONE, inventory: NONE, expenses: NONE,
    certificates:       NONE, events: NONE,
    visitor_management: NONE, tasks: NONE, reports: NONE, settings: NONE,
    role_management:    NONE, audit_logs: NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'none'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PARENT — Own children only
  // ─────────────────────────────────────────────────────────────────────────
  parent: {
    admissions:         NONE,
    students:           P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
    attendance:         P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
    academics:          NONE,
    timetable:          P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
    examinations:       P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
    homework:           P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
    study_material:     P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
    communication:      P(true, true, false, false, false, false, 'own_branch', 'own', 'own_children'),
    fees:               P(true, true, false, false, false, false, 'own_branch', 'own', 'own_children'), // view + pay
    payroll:            NONE,
    hr:                 NONE,
    transport:          P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'), // track
    hostel:             NONE,
    library:            NONE,
    inventory:          NONE,
    expenses:           NONE,
    certificates:       P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'), // view/download
    events:             P(true, true, false, false, false, false, 'own_branch', 'own', 'own_children'),
    visitor_management: NONE,
    tasks:              NONE,
    reports:            NONE,
    settings:           P(true, false, true, false, false, false, 'own_branch', 'own', 'none'), // own profile
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'own_children'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STUDENT — Own data only
  // ─────────────────────────────────────────────────────────────────────────
  student: {
    admissions:         NONE,
    students:           P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    attendance:         P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    academics:          P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    timetable:          P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    examinations:       P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    homework:           P(true, true, true, false, false, false, 'own_branch', 'own', 'own'), // view + submit
    study_material:     P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    communication:      P(true, false, false, false, false, false, 'own_branch', 'own', 'own'), // receive only
    fees:               NONE,
    payroll:            NONE,
    hr:                 NONE,
    transport:          NONE,
    hostel:             P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    library:            P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    inventory:          NONE,
    expenses:           NONE,
    certificates:       P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
    events:             P(true, true, false, false, false, false, 'own_branch', 'own', 'own'),
    visitor_management: NONE,
    tasks:              NONE,
    reports:            NONE,
    settings:           P(true, false, true, false, false, false, 'own_branch', 'own', 'none'),
    role_management:    NONE,
    audit_logs:         NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'own'),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STAFF (generic — non-specialized staff like nurse, peon, security)
  // ─────────────────────────────────────────────────────────────────────────
  staff: {
    admissions:         NONE, students:           P(true, false, true, false, false, false, 'own_branch', 'school', 'all'), // health records
    attendance:         NONE, academics: NONE, timetable: NONE, examinations: NONE,
    homework:           NONE, study_material: NONE,
    communication:      P(true, false, false, false, false, false, 'own_branch', 'own', 'none'),
    fees:               NONE, payroll: NONE,
    hr:                 P(true, true, false, false, false, false, 'own_branch', 'own', 'none'), // own leave
    transport:          NONE, hostel: NONE, library: NONE, inventory: NONE, expenses: NONE,
    certificates:       NONE, events: VIEW(), visitor_management: NONE,
    tasks:              P(true, false, false, false, false, false, 'own_branch', 'own', 'none'),
    reports:            NONE, settings: NONE, role_management: NONE, audit_logs: NONE,
    dashboard:          P(true, false, false, false, false, false, 'own_branch', 'own', 'none'),
  },
};

// ─── Main seeder ─────────────────────────────────────────────────────────────
async function seedPermissions() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  let inserted = 0, updated = 0;

  for (const [role, modules] of Object.entries(MATRIX)) {
    for (const [module, perms] of Object.entries(modules)) {
      await Permission.findOneAndUpdate(
        { role, module },
        { role, module, ...perms },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      inserted++;
    }
  }

  console.log(`\n✅ Permission matrix seeded: ${inserted} role×module entries`);
  console.log('\nRoles seeded:');
  Object.keys(MATRIX).forEach(r => console.log(`  → ${r} (${Object.keys(MATRIX[r]).length} modules)`));

  await mongoose.disconnect();
}

seedPermissions().catch(err => { console.error(err); process.exit(1); });
