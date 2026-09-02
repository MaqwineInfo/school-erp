/**
 * Platform-level scheduled jobs.
 *
 * Domain jobs (fee reminders, absence sweeps, overdue library books) are registered by
 * their own modules via `module.jobs` — architecture §9. Only cross-cutting infrastructure
 * jobs live here.
 */
const { drainOutbox } = require('../events/bus');
const { purgeExpired } = require('../../platform/audit/auditLogger');
const config = require('../../config/env');

const coreJobs = [
  {
    name: 'outbox.dispatch',
    description: 'Dispatch pending domain events from the transactional outbox',
    everyMs: config.scheduler.outboxIntervalMs,
    runOnStart: true,
    handler: async () => {
      await drainOutbox({ batchSize: 100 });
    },
  },
  {
    name: 'audit.retention',
    description: 'Delete audit rows past their RBAC §6.3 retention date',
    everyMs: 24 * 60 * 60 * 1000,
    handler: async () => {
      await purgeExpired();
    },
  },
  {
    name: 'idempotency.cleanup',
    description: 'Remove expired idempotency records (belt and braces alongside the TTL index)',
    everyMs: 6 * 60 * 60 * 1000,
    handler: async () => {
      const mongoose = require('mongoose');
      const IdempotencyRecord = mongoose.model('IdempotencyRecord');
      await IdempotencyRecord.deleteMany({ expiresAt: { $lt: new Date() } });
    },
  },
  {
    name: 'sessions.cleanup',
    description: 'Purge revoked and expired refresh sessions',
    everyMs: 12 * 60 * 60 * 1000,
    handler: async () => {
      const mongoose = require('mongoose');
      const Session = mongoose.model('Session');
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await Session.deleteMany({
        $or: [{ expiresAt: { $lt: new Date() } }, { revokedAt: { $lt: cutoff } }],
      });
    },
  },
];

module.exports = { coreJobs };
