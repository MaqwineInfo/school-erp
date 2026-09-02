const routes = require('./communication.routes');
const service = require('./communication.service');
const { wire } = require('./communication.events');
const { seedTemplates, DEFAULT_TEMPLATES } = require('./defaultTemplates');

module.exports = {
  name: 'communication',
  routes,
  jobs: [],
  permissions: ['communication'],
  subscribe: wire,
  events: {
    publishes: ['NOTIFICATION_DELIVERED'],
    subscribes: [
      'ATTENDANCE_ABSENT', 'ATTENDANCE_LONG_ABSENCE',
      'INVOICE_CREATED', 'PAYMENT_RECEIVED', 'FEE_OVERDUE',
      'RESULT_PUBLISHED', 'STUDENT_ENROLLED', 'APPROVAL_REQUESTED', 'EMERGENCY_RAISED',
    ],
  },

  service: {
    send: service.send,
    notifyGuardians: service.notifyGuardians,
    broadcast: service.broadcast,
    seedTemplates,
  },

  DEFAULT_TEMPLATES,
};
