/**
 * In-process event bus with a transactional outbox.
 *
 * Architecture §13.1 / ADR-08 / ADR-11.
 *
 * Publishers call `publish(name, payload, { session })` INSIDE their transaction. The event
 * is written to the outbox in that same transaction, so:
 *   - a rolled-back transaction publishes nothing
 *   - a committed transaction never loses its event
 *
 * The dispatcher polls the outbox after commit and invokes subscribers. Swapping this for
 * Kafka means reimplementing `dispatchOne` — publishers and subscribers do not change.
 */
const mongoose = require('mongoose');
const logger = require('../../config/logger');
const config = require('../../config/env');

// Registers the OutboxEvent schema. There is no central model loader — models register as a
// side effect of being required, and nothing else requires this one, so the `mongoose.model(
// 'OutboxEvent')` lookups below (and in platform/health/readiness.js) would otherwise throw
// MissingSchemaError on every dispatch tick.
require('../../models/OutboxEvent');

/** name → [handler] */
const handlers = new Map();

const MAX_ATTEMPTS = 5;
/** Exponential backoff in seconds, indexed by attempt. */
const BACKOFF = [0, 10, 60, 300, 1800];

function subscribe(name, handler, { label } = {}) {
  if (typeof handler !== 'function') throw new Error(`subscribe(${name}) requires a function`);
  if (!handlers.has(name)) handlers.set(name, []);
  handlers.get(name).push(Object.assign(handler, { _label: label || handler.name || 'anonymous' }));
  return () => {
    const list = handlers.get(name) || [];
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  };
}

function subscribersFor(name) {
  return handlers.get(name) || [];
}

/**
 * Publish an event. MUST be given the active session when called inside a transaction.
 */
async function publish(name, payload = {}, { session, req, tenantId, branchId } = {}) {
  const OutboxEvent = mongoose.model('OutboxEvent');

  const doc = {
    name,
    payload,
    tenantId: tenantId ?? req?.principal?.tenantId ?? payload.tenantId ?? null,
    branchId: branchId ?? req?.principal?.branchId ?? payload.branchId ?? null,
    requestId: req?.requestId ?? null,
    causedBy: req?.principal?.userId ?? null,
    status: 'pending',
    availableAt: new Date(),
  };

  const [created] = await OutboxEvent.create([doc], { session });
  return created;
}

/** Invoke every subscriber for one event. A failing subscriber does not block the others. */
async function dispatchOne(event) {
  const subs = subscribersFor(event.name);
  if (!subs.length) return { delivered: 0, failed: 0 };

  let failed = 0;
  await Promise.all(
    subs.map(async (h) => {
      try {
        await h(event.payload, { event });
      } catch (err) {
        failed += 1;
        logger.error('Event subscriber failed', {
          event: event.name,
          subscriber: h._label,
          error: err.message,
        });
      }
    }),
  );

  return { delivered: subs.length - failed, failed };
}

/** Drain a batch of pending outbox events. Called by the scheduler. */
async function drainOutbox({ batchSize = 50 } = {}) {
  const OutboxEvent = mongoose.model('OutboxEvent');
  const now = new Date();

  const pending = await OutboxEvent.find({
    status: 'pending',
    availableAt: { $lte: now },
  })
    .sort({ createdAt: 1 })
    .limit(batchSize);

  let dispatched = 0;

  for (const event of pending) {
    try {
      const result = await dispatchOne(event);

      if (result.failed > 0) {
        const attempts = event.attempts + 1;
        const dead = attempts >= MAX_ATTEMPTS;
        await OutboxEvent.updateOne(
          { _id: event._id },
          {
            $set: {
              status: dead ? 'dead' : 'pending',
              attempts,
              lastError: `${result.failed} subscriber(s) failed`,
              availableAt: new Date(Date.now() + (BACKOFF[attempts] ?? 1800) * 1000),
            },
          },
        );
        if (dead) {
          logger.error('Event moved to dead letter', { event: event.name, id: String(event._id) });
        }
        continue;
      }

      await OutboxEvent.updateOne(
        { _id: event._id },
        { $set: { status: 'dispatched', dispatchedAt: new Date() } },
      );
      dispatched += 1;
    } catch (err) {
      logger.error('Outbox dispatch error', { event: event.name, error: err.message });
    }
  }

  return dispatched;
}

/**
 * Test helper: publish and dispatch immediately, skipping the outbox poll.
 * Never used in production code paths.
 */
async function publishNow(name, payload, ctx) {
  const event = await publish(name, payload, ctx);
  await dispatchOne(event);
  const OutboxEvent = mongoose.model('OutboxEvent');
  await OutboxEvent.updateOne(
    { _id: event._id },
    { $set: { status: 'dispatched', dispatchedAt: new Date() } },
  );
  return event;
}

function clearSubscribers() {
  handlers.clear();
}

module.exports = {
  subscribe,
  publish,
  publishNow,
  drainOutbox,
  dispatchOne,
  subscribersFor,
  clearSubscribers,
  outboxIntervalMs: config.scheduler.outboxIntervalMs,
};
