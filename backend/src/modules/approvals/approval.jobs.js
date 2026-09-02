const { Scope } = require('../../platform/scope/scope');
const service = require('./approval.service');

const jobs = [
  {
    name: 'approvals.escalate',
    description: 'Escalate approval requests that have breached their SLA',
    everyMs: 60 * 60 * 1000,
    handler: async () => {
      Scope.system('job:approvals.escalate');
      await service.escalateOverdue();
    },
  },
];

module.exports = { jobs };
