/**
 * Liveness and readiness probes.
 *
 * Architecture §19. `/health` answers "is the process up"; `/health/ready` answers "can it
 * actually serve traffic" — which for this system means MongoDB is connected, transactions
 * are available (a standalone mongod silently breaks every money flow), storage responds,
 * and the scheduler is running.
 */
const router = require('express').Router();
const mongoose = require('mongoose');

const config = require('../../config/env');
const { supportsTransactions } = require('../uow/unitOfWork');
const scheduler = require('../../infra/scheduler/scheduler');

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** Liveness — deliberately cheap, and excluded from HTTP logging. */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      env: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

/** Readiness — checks every dependency the app needs to serve a request correctly. */
router.get('/ready', async (req, res) => {
  const checks = {};

  // MongoDB
  const state = mongoose.connection.readyState;
  checks.database = {
    ok: state === 1,
    state: STATES[state] ?? String(state),
    name: mongoose.connection.name ?? null,
  };

  // Transactions — a standalone mongod cannot run them, and the failure mode is a
  // half-written payment rather than an obvious error, so surface it here.
  if (checks.database.ok) {
    const txn = await supportsTransactions().catch(() => false);
    checks.transactions = {
      ok: txn,
      detail: txn
        ? 'replica set detected'
        : 'NOT AVAILABLE — MongoDB must run as a replica set for fee, payroll and enrolment flows',
    };
  } else {
    checks.transactions = { ok: false, detail: 'database unavailable' };
  }

  // Storage
  try {
    const { forTenant } = require('../../adapters/registry');
    const storage = await forTenant('storage');
    checks.storage = { ok: true, provider: storage.provider };
  } catch (err) {
    checks.storage = { ok: false, error: err.message };
  }

  // Scheduler + outbox backlog
  const jobs = scheduler.status();
  const failing = jobs.filter((j) => j.lastError);
  checks.scheduler = {
    ok: failing.length === 0,
    enabled: config.scheduler.enabled,
    jobs: jobs.length,
    failing: failing.map((j) => ({ name: j.name, error: j.lastError })),
  };

  if (checks.database.ok) {
    try {
      const OutboxEvent = mongoose.model('OutboxEvent');
      const [pending, dead] = await Promise.all([
        OutboxEvent.countDocuments({ status: 'pending' }),
        OutboxEvent.countDocuments({ status: 'dead' }),
      ]);
      checks.outbox = { ok: dead === 0, pending, dead };
    } catch {
      checks.outbox = { ok: true, detail: 'not initialised' };
    }
  }

  const ok = Object.values(checks).every((c) => c.ok);
  res.status(ok ? 200 : 503).json({ success: ok, data: { status: ok ? 'ready' : 'degraded', checks } });
});

/** Job monitor for the platform console (wireframe WF-0033). */
router.get('/jobs', (req, res) => {
  res.json({ success: true, data: scheduler.status() });
});

module.exports = router;
