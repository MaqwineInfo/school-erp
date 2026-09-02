/**
 * The domain event catalogue.
 *
 * Architecture §13.1 / ADR-11. Names and payload shapes come from
 * `Enterprise_School_ERP Plan.docx` Appendix C UNCHANGED, so replacing the in-process bus
 * with Kafka later requires no change to any publisher or subscriber.
 */

const EVENTS = {
  // Identity
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  ROLE_CHANGED: 'ROLE_CHANGED',

  // Tenant
  TENANT_CREATED: 'TENANT_CREATED',
  MODULE_TOGGLED: 'MODULE_TOGGLED',

  // Admissions / students
  LEAD_CREATED: 'LEAD_CREATED',
  APPLICATION_APPROVED: 'APPLICATION_APPROVED',
  STUDENT_ENROLLED: 'STUDENT_ENROLLED',
  STUDENT_PROMOTED: 'STUDENT_PROMOTED',
  STUDENT_WITHDRAWN: 'STUDENT_WITHDRAWN',

  // Attendance
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
  ATTENDANCE_ABSENT: 'ATTENDANCE_ABSENT',
  ATTENDANCE_LONG_ABSENCE: 'ATTENDANCE_LONG_ABSENCE',

  // Exams
  EXAM_PUBLISHED: 'EXAM_PUBLISHED',
  RESULT_PUBLISHED: 'RESULT_PUBLISHED',
  MARKS_LOCKED: 'MARKS_LOCKED',

  // Fees
  INVOICE_CREATED: 'INVOICE_CREATED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FEE_OVERDUE: 'FEE_OVERDUE',

  // Payroll
  PAYSLIP_GENERATED: 'PAYSLIP_GENERATED',

  // Library
  BOOK_OVERDUE: 'BOOK_OVERDUE',

  // Transport
  BUS_NEAR_STOP: 'BUS_NEAR_STOP',
  BUS_DELAYED: 'BUS_DELAYED',
  EMERGENCY_RAISED: 'EMERGENCY_RAISED',

  // Approvals
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED: 'APPROVAL_GRANTED',
  APPROVAL_REJECTED: 'APPROVAL_REJECTED',
  APPROVAL_ESCALATED: 'APPROVAL_ESCALATED',

  // Certificates
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',

  // Communication
  NOTIFICATION_DELIVERED: 'NOTIFICATION_DELIVERED',
};

/**
 * Documented producers and consumers — kept here so the wiring is greppable and so the
 * verification suite can assert that every declared subscriber actually registered.
 */
const CATALOGUE = {
  [EVENTS.STUDENT_ENROLLED]: { producer: 'admissions', consumers: ['fees', 'communication', 'academics'] },
  [EVENTS.STUDENT_PROMOTED]: { producer: 'students', consumers: ['fees', 'attendance'] },
  [EVENTS.ATTENDANCE_ABSENT]: { producer: 'attendance', consumers: ['communication'] },
  [EVENTS.ATTENDANCE_LONG_ABSENCE]: { producer: 'attendance', consumers: ['communication'] },
  [EVENTS.INVOICE_CREATED]: { producer: 'fees', consumers: ['communication'] },
  [EVENTS.PAYMENT_RECEIVED]: { producer: 'fees', consumers: ['communication', 'reports'] },
  [EVENTS.PAYMENT_FAILED]: { producer: 'fees', consumers: ['communication'] },
  [EVENTS.RESULT_PUBLISHED]: { producer: 'examinations', consumers: ['communication'] },
  [EVENTS.BOOK_OVERDUE]: { producer: 'library', consumers: ['communication'] },
  [EVENTS.BUS_NEAR_STOP]: { producer: 'transport', consumers: ['communication'] },
  [EVENTS.EMERGENCY_RAISED]: { producer: 'transport', consumers: ['communication'] },
  [EVENTS.APPROVAL_GRANTED]: { producer: 'approvals', consumers: ['*'] },
  [EVENTS.ROLE_CHANGED]: { producer: 'identity', consumers: ['auth', 'rbac'] },
};

module.exports = { EVENTS, CATALOGUE };
