/**
 * No-op payment driver.
 *
 * Creates plausible order ids and treats every verification as valid, so the fee-collection
 * flow is fully exercisable offline. Every response carries `simulated: true` — a caller
 * that ships this to production will see it in the audit trail.
 */
const crypto = require('crypto');
const logger = require('../../config/logger');

function create(settings, ctx = {}) {
  return {
    provider: 'noop',
    capability: 'payment',

    async createOrder({ amount, currency = 'INR', receipt, notes }) {
      const id = `order_noop_${crypto.randomBytes(8).toString('hex')}`;
      logger.info('[noop:payment] would create order', {
        amount, currency, receipt, tenantId: ctx.tenantId,
      });
      return { id, amount, currency, receipt, notes, status: 'created', provider: 'noop', simulated: true };
    },

    /** Always valid — there is no real signature to check. */
    verifyWebhookSignature() {
      return true;
    },

    parseWebhook(body) {
      return {
        event: body?.event ?? 'payment.captured',
        paymentId: body?.payload?.payment?.entity?.id ?? `pay_noop_${crypto.randomBytes(6).toString('hex')}`,
        orderId: body?.payload?.payment?.entity?.order_id ?? null,
        amount: body?.payload?.payment?.entity?.amount ?? 0,
        status: 'captured',
        method: body?.payload?.payment?.entity?.method ?? 'upi',
        simulated: true,
      };
    },

    async fetchPayment(paymentId) {
      return { id: paymentId, status: 'captured', simulated: true };
    },

    async refund({ paymentId, amount }) {
      const id = `rfnd_noop_${crypto.randomBytes(8).toString('hex')}`;
      logger.info('[noop:payment] would refund', { paymentId, amount, tenantId: ctx.tenantId });
      return { id, paymentId, amount, status: 'processed', provider: 'noop', simulated: true };
    },
  };
}

module.exports = { create };
