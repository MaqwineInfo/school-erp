/**
 * Communication event subscribers — the wiring that makes every other module's events
 * actually reach a parent.
 *
 * Each handler maps a domain event to a template code and a channel set. This is the
 * layer that was entirely missing: modules published nothing, and nothing consumed it.
 */
const { Scope } = require('../../platform/scope/scope');
const { subscribe } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const service = require('./communication.service');
const money = require('../../shared/money');
const logger = require('../../config/logger');

const systemScope = (tenantId, reason) => Scope.system(`event:${reason}`, { tenantId });

function wire() {
  // ── Attendance ─────────────────────────────────────────────────────────────
  subscribe(
    EVENTS.ATTENDANCE_ABSENT,
    async (p) => {
      await service.notifyGuardians(systemScope(p.tenantId, 'attendance_absent'), {
        studentId: p.studentId,
        code: 'ATTENDANCE_ABSENT',
        channels: ['sms'],
        vars: { date: new Date(p.date).toLocaleDateString('en-IN') },
      });
    },
    { label: 'comms:absenceAlert' },
  );

  subscribe(
    EVENTS.ATTENDANCE_LONG_ABSENCE,
    async (p) => {
      await service.notifyGuardians(systemScope(p.tenantId, 'long_absence'), {
        studentId: p.studentId,
        code: 'ATTENDANCE_LONG_ABSENCE',
        channels: ['sms'],
        vars: { days: String(p.consecutiveDays) },
      });
    },
    { label: 'comms:longAbsenceAlert' },
  );

  // ── Fees ───────────────────────────────────────────────────────────────────
  subscribe(
    EVENTS.INVOICE_CREATED,
    async (p) => {
      await service.notifyGuardians(systemScope(p.tenantId, 'invoice_created'), {
        studentId: p.studentId,
        code: 'INVOICE_CREATED',
        channels: ['sms'],
        vars: {
          amount: money.format(p.amount),
          demandNo: p.demandNo,
          dueDate: p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : '',
        },
      });
    },
    { label: 'comms:invoiceCreated' },
  );

  subscribe(
    EVENTS.PAYMENT_RECEIVED,
    async (p) => {
      await service.notifyGuardians(systemScope(p.tenantId, 'payment_received'), {
        studentId: p.studentId,
        code: 'PAYMENT_RECEIVED',
        channels: ['sms'],
        vars: { amount: money.format(p.amount), receiptNo: p.receiptNo },
      });
    },
    { label: 'comms:paymentReceipt' },
  );

  subscribe(
    EVENTS.FEE_OVERDUE,
    async (p) => {
      await service.notifyGuardians(systemScope(p.tenantId, 'fee_reminder'), {
        studentId: p.studentId,
        code: 'FEE_REMINDER',
        channels: ['sms'],
        vars: {
          amount: money.format(p.amount),
          dueDate: p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : '',
        },
      });
    },
    { label: 'comms:feeReminder' },
  );

  // ── Exams ──────────────────────────────────────────────────────────────────
  subscribe(
    EVENTS.RESULT_PUBLISHED,
    async (p) => {
      logger.info('Result published — report cards queued for delivery', {
        tenantId: String(p.tenantId),
        examId: p.examId,
      });
      // Per-student report card delivery is raised by the exams module once each PDF
      // exists; this handler exists so the event has a declared consumer.
    },
    { label: 'comms:resultPublished' },
  );

  // ── Admissions ─────────────────────────────────────────────────────────────
  subscribe(
    EVENTS.STUDENT_ENROLLED,
    async (p) => {
      await service.notifyGuardians(systemScope(p.tenantId, 'student_enrolled'), {
        studentId: p.studentId,
        code: 'WELCOME',
        channels: ['sms'],
        vars: {},
      });
    },
    { label: 'comms:welcomeKit' },
  );

  // ── Approvals ──────────────────────────────────────────────────────────────
  subscribe(
    EVENTS.APPROVAL_REQUESTED,
    async (p) => {
      logger.info('Approval requested', { requestId: p.requestId, workflow: p.workflowKey });
    },
    { label: 'comms:approvalRequested' },
  );

  // ── Transport ──────────────────────────────────────────────────────────────
  subscribe(
    EVENTS.EMERGENCY_RAISED,
    async (p) => {
      // Critical: bypasses quiet hours and the throttle.
      await service.send(systemScope(p.tenantId, 'emergency'), {
        code: 'EMERGENCY',
        channel: 'sms',
        to: p.notifyPhone,
        vars: { vehicle: p.vehicleNo, route: p.routeName },
        force: true,
      });
    },
    { label: 'comms:emergency' },
  );
}

module.exports = { wire };
