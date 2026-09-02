const routes = require('./student.routes');
const service = require('./student.service');

module.exports = {
  name: 'students',
  routes,
  jobs: [],
  permissions: ['students'],
  events: { publishes: [], subscribes: [] },

  service: {
    getById: service.getById,
    list: service.list,
    profile360: service.profile360,
    create: service.create,
    withdraw: service.withdraw,
  },
};
