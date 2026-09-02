const { Scope } = require('../../platform/scope/scope');
const service = require('./attendance.service');

/**
 * Specification §9.1: parents are notified of an absence within 30 minutes of school
 * start, and a long absence is flagged at 3, 7 and 15 days. Neither existed — there was
 * no scheduler at all.
 */
const jobs = [
  {
    name: 'attendance.notifyAbsentees',
    description: 'Queue absence notifications to parents for newly marked sheets',
    everyMs: 15 * 60 * 1000,
    handler: async () => {
      Scope.system('job:attendance.notifyAbsentees');
      await service.notifyAbsentees();
    },
  },
  {
    name: 'attendance.longAbsence',
    description: 'Flag students absent for 3, 7 or 15 consecutive days',
    everyMs: 24 * 60 * 60 * 1000,
    handler: async () => {
      Scope.system('job:attendance.longAbsence');
      await service.detectLongAbsence();
    },
  },
];

module.exports = { jobs };
