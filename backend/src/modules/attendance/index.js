const routes = require('./attendance.routes');
const service = require('./attendance.service');
const { jobs } = require('./attendance.jobs');

module.exports = {
  name: 'attendance',
  routes,
  jobs,
  permissions: ['attendance'],
  events: {
    publishes: ['ATTENDANCE_MARKED', 'ATTENDANCE_ABSENT', 'ATTENDANCE_LONG_ABSENCE'],
    subscribes: [],
  },

  service: {
    studentSummary: service.studentSummary,
    groupRegister: service.groupRegister,
  },
};
