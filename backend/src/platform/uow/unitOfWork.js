/**
 * Unit of work — MongoDB transactions with retry on transient errors.
 *
 * Architecture §10.1 / principle 4. Everything touching money, enrolment, payroll or
 * certificates runs inside one of these. The previous code had exactly one transaction in
 * the entire backend (the onboarding controller), which is why a crash between
 * `FeePayment.create` and the demand balance update left money recorded against an
 * unchanged balance.
 *
 * REQUIRES a replica set. A standalone mongod cannot run transactions — see the
 * verification document, Part 0.1.
 */
const mongoose = require('mongoose');
const logger = require('../../config/logger');

const TRANSIENT_LABELS = ['TransientTransactionError', 'UnknownTransactionCommitResult'];

function isTransient(err) {
  return (err?.errorLabels || []).some((l) => TRANSIENT_LABELS.includes(l));
}

/**
 * Run `fn` inside a transaction, retrying transient failures.
 *
 * @param {(session: import('mongoose').ClientSession, ctx: object) => Promise<any>} fn
 * @param {object} [opts] { maxRetries, existingSession }
 */
async function run(fn, opts = {}) {
  const { maxRetries = 3, session: existing } = opts;

  // Nested call — join the caller's transaction rather than starting a second one.
  if (existing) {
    return fn(existing, { joined: true });
  }

  // In environments without a replica set (some CI setups, unit tests against a plain
  // mongod) transactions are unavailable. Fail loudly in production; degrade in dev.
  const session = await mongoose.startSession();
  let attempt = 0;

  try {
    for (;;) {
      attempt += 1;
      try {
        let result;
        await session.withTransaction(async () => {
          result = await fn(session, { attempt });
        });
        return result;
      } catch (err) {
        if (isTransient(err) && attempt < maxRetries) {
          logger.warn('Transaction retry', { attempt, error: err.message });
          continue;
        }
        throw err;
      }
    }
  } finally {
    await session.endSession();
  }
}

/**
 * True when the connected server supports transactions. Used by the health check and by
 * the startup guard so a misconfigured deployment fails fast rather than at first payment.
 */
async function supportsTransactions() {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ hello: 1 });
    return !!(info.setName || info.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

module.exports = { run, supportsTransactions, isTransient };
