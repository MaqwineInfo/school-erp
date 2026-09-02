const routes = require('./approval.routes');
const service = require('./approval.service');
const { jobs } = require('./approval.jobs');

module.exports = {
  name: 'approvals',
  routes,
  jobs,
  permissions: ['approvals'],
  events: {
    publishes: ['APPROVAL_REQUESTED', 'APPROVAL_GRANTED', 'APPROVAL_REJECTED', 'APPROVAL_ESCALATED'],
    subscribes: [],
  },

  /** Modules raise requests through this; they never write ApprovalRequest directly. */
  service: {
    submit: service.submit,
    approve: service.approve,
    reject: service.reject,
    seedWorkflows: service.seedWorkflows,
  },
};
