const routes = require('./auth.routes');
const service = require('./auth.service');

module.exports = {
  name: 'identity',
  routes,
  jobs: [],
  permissions: ['role_management'],
  events: { publishes: ['USER_LOGGED_IN', 'PASSWORD_CHANGED', 'ROLE_CHANGED'], subscribes: [] },

  service: {
    buildAuthResponse: service.buildAuthResponse,
    hashPassword: service.hashPassword,
    validatePassword: service.validatePassword,
    bumpTokenVersion: service.bumpTokenVersion,
  },
};
