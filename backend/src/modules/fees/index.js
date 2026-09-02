/**
 * Fees module public interface (architecture §9).
 *
 * Certificates calls `hasClearedDues` for the TC no-dues check; admissions calls
 * `generateDemands` after enrolment. Neither imports a fee model.
 */
const routes = require('./fee.routes');
const service = require('./fee.service');
const { jobs } = require('./fee.jobs');
const { wire } = require('./fee.events');

module.exports = {
  name: 'fees',
  routes,
  jobs,
  permissions: ['fees'],
  subscribe: wire,
  events: {
    publishes: ['INVOICE_CREATED', 'PAYMENT_RECEIVED', 'FEE_OVERDUE'],
    subscribes: ['STUDENT_ENROLLED'],
  },

  service: {
    hasClearedDues: service.hasClearedDues,
    outstandingForStudent: service.outstandingForStudent,
    generateDemands: service.generateDemands,
    collectPayment: service.collectPayment,
    dayBook: service.dayBook,
  },
};
