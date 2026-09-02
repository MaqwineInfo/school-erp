/**
 * Idempotency-Key middleware.
 *
 * Architecture §10.3. Required on payment collection, admission enrolment, payroll release
 * and every gateway webhook. `docs/workflows/fee-collection-flow.md` specified this from
 * the start ("Idempotency key prevents re-creation on retry") and no code implemented it —
 * so a retried payment created a second receipt and a second ledger effect.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const config = require('../../config/env');
const { BadRequestError, ConflictError } = require('../../shared/errors');

function hashRequest(req) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ body: req.body ?? {}, params: req.params ?? {} }))
    .digest('hex');
}

/**
 * @param {object} opts
 * @param {boolean} [opts.required=true] reject the request when the header is absent
 */
function idempotent({ required = true } = {}) {
  return async (req, res, next) => {
    try {
      const key = req.get('Idempotency-Key');
      if (!key) {
        if (required) {
          throw new BadRequestError(
            'Idempotency-Key header is required for this operation. ' +
              'Send a unique key per logical request and reuse it on retries.',
          );
        }
        return next();
      }

      const IdempotencyRecord = mongoose.model('IdempotencyRecord');
      const tenantId = req.principal?.tenantId ?? null;
      const endpoint = `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`;
      const requestHash = hashRequest(req);

      const existing = await IdempotencyRecord.findOne({ tenantId, key }).lean();

      if (existing) {
        // Same key, different payload — almost always a client bug, and dangerous.
        if (existing.requestHash !== requestHash || existing.endpoint !== endpoint) {
          throw new ConflictError(
            'This Idempotency-Key was already used for a different request',
          );
        }
        if (existing.status === 'completed') {
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(existing.statusCode || 200).json(existing.responseBody);
        }
        if (existing.status === 'in_progress') {
          throw new ConflictError('A request with this Idempotency-Key is still in progress');
        }
        // 'failed' — allow a genuine retry to proceed.
      }

      const expiresAt = new Date(Date.now() + config.idempotency.ttlHours * 3600 * 1000);

      await IdempotencyRecord.findOneAndUpdate(
        { tenantId, key },
        {
          $set: {
            tenantId,
            key,
            endpoint,
            requestHash,
            status: 'in_progress',
            userId: req.principal?.userId ?? null,
            expiresAt,
          },
        },
        { upsert: true, new: true },
      );

      // Capture the response so a replay can return exactly what the original did.
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const statusCode = res.statusCode;
        const status = statusCode >= 200 && statusCode < 300 ? 'completed' : 'failed';
        IdempotencyRecord.updateOne(
          { tenantId, key },
          { $set: { status, statusCode, responseBody: body } },
        ).catch(() => {
          /* never fail a request because bookkeeping failed */
        });
        return originalJson(body);
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Programmatic guard for non-HTTP entry points (gateway webhooks processed off a queue).
 * Returns true when this key has already been handled.
 */
async function alreadyProcessed(tenantId, key) {
  const IdempotencyRecord = mongoose.model('IdempotencyRecord');
  const rec = await IdempotencyRecord.findOne({ tenantId, key, status: 'completed' }).lean();
  return !!rec;
}

module.exports = { idempotent, alreadyProcessed, hashRequest };
