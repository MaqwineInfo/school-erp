/**
 * Job scheduler.
 *
 * Architecture §13.2. The system had NO cron, NO queue and NO scheduler, which is the
 * single reason every notification in every workflow document was unimplemented — absence
 * SMS, fee reminders, overdue alerts, document-expiry warnings and payslip delivery all
 * need something to run them.
 *
 * Deliberately dependency-free (setTimeout-based) and single-process for now. The
 * interface matches a BullMQ-backed implementation so swapping it later is contained.
 */
const logger = require('../../config/logger');
const config = require('../../config/env');
const { Scope } = require('../../platform/scope/scope');

const jobs = new Map();
let timer = null;
let running = false;

/**
 * @typedef {Object} JobDef
 * @property {string}   name
 * @property {number}   everyMs        interval between runs
 * @property {Function} handler        async (ctx) => void
 * @property {boolean}  [runOnStart]
 * @property {string}   [description]
 */

function register(def) {
  if (!def?.name || typeof def.handler !== 'function') {
    throw new Error('scheduler.register requires { name, handler }');
  }
  if (jobs.has(def.name)) throw new Error(`Job "${def.name}" is already registered`);

  jobs.set(def.name, {
    ...def,
    nextRunAt: def.runOnStart ? 0 : Date.now() + def.everyMs,
    running: false,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null,
    runs: 0,
    failures: 0,
  });
  return def.name;
}

function registerAll(defs = []) {
  defs.forEach(register);
}

/** Run one job now, regardless of schedule. Used by tests and by an admin "run now". */
async function runJob(name) {
  const job = jobs.get(name);
  if (!job) throw new Error(`Unknown job "${name}"`);
  if (job.running) return { skipped: 'already running' };

  job.running = true;
  const started = Date.now();

  try {
    // Every job gets a system scope with its name as the reason, so cross-tenant access
    // from background work is always attributable (architecture §6.4).
    await job.handler({ scope: Scope.system(`job:${name}`), jobName: name });
    job.runs += 1;
    job.lastError = null;
    return { ok: true };
  } catch (err) {
    job.failures += 1;
    job.lastError = err.message;
    logger.error('Scheduled job failed', { job: name, error: err.message, stack: err.stack });
    return { ok: false, error: err.message };
  } finally {
    job.running = false;
    job.lastRunAt = new Date();
    job.lastDurationMs = Date.now() - started;
    job.nextRunAt = Date.now() + job.everyMs;
  }
}

async function tick() {
  const now = Date.now();
  const due = [...jobs.values()].filter((j) => !j.running && j.nextRunAt <= now);
  for (const job of due) {
    // Sequential on purpose: these are background jobs sharing one process, and a burst
    // of parallel sweeps would compete with request traffic.
    await runJob(job.name);
  }
}

function start({ intervalMs = 1000 } = {}) {
  if (running) return;
  if (!config.scheduler.enabled) {
    logger.info('Scheduler disabled by configuration');
    return;
  }
  running = true;
  timer = setInterval(() => {
    tick().catch((err) => logger.error('Scheduler tick failed', { error: err.message }));
  }, intervalMs);
  if (timer.unref) timer.unref();
  logger.info('Scheduler started', { jobs: [...jobs.keys()] });
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  running = false;
}

/** Status for the health endpoint and the platform console's job monitor (WF-0033). */
function status() {
  return [...jobs.values()].map((j) => ({
    name: j.name,
    description: j.description,
    everyMs: j.everyMs,
    running: j.running,
    lastRunAt: j.lastRunAt,
    lastDurationMs: j.lastDurationMs,
    lastError: j.lastError,
    runs: j.runs,
    failures: j.failures,
    nextRunAt: new Date(j.nextRunAt),
  }));
}

function clear() {
  stop();
  jobs.clear();
}

module.exports = { register, registerAll, runJob, start, stop, status, clear, tick };
