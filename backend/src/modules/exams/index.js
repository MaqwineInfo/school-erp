const routes = require('./exam.routes');
const service = require('./marks.service');
const { jobs } = require('./exam.jobs');
const { wire } = require('./exam.events');

module.exports = {
  name: 'exams',
  routes,
  jobs,
  permissions: ['examinations'],
  subscribe: wire,
  events: {
    publishes: ['MARKS_LOCKED', 'RESULT_PUBLISHED'],
    subscribes: ['APPROVAL_GRANTED'],
  },

  service: {
    reportCard: service.reportCard,
    publishReadiness: service.publishReadiness,
  },
};
