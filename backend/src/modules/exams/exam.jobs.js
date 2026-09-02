const { Scope } = require('../../platform/scope/scope');
const service = require('./marks.service');

const jobs = [
  {
    name: 'exams.relockExpired',
    description: 'Re-lock marks whose 24-hour correction window has expired (RBAC §5.4)',
    everyMs: 30 * 60 * 1000,
    handler: async () => {
      Scope.system('job:exams.relockExpired');
      await service.relockExpired();
    },
  },
];

module.exports = { jobs };
