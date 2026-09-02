/**
 * Razorpay driver.
 *
 * Implements the HMAC webhook verification that `docs/workflows/fee-collection-flow.md`
 * requires ("G{HMAC Verified?} -->|No| H[Reject 400]") and that no code performed — the
 * webhook route did not exist at all.
 *
 * Amounts are integer paise throughout, which is also Razorpay's native unit (ADR-07).
 */
const crypto = require('crypto');
const logger = require('../../config/logger');

const BASE_URL = 'https://api.razorpay.com/v1';

function create(settings, ctx = {}) {
  const { keyId, keySecret, webhookSecret } = settings;
  if (!keyId || !keySecret) throw new Error('razorpay driver requires keyId and keySecret');

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

  async function call(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      logger.error('Razorpay call failed', {
        path, status: res.status, error: json?.error, tenantId: ctx.tenantId,
      });
      const err = new Error(json?.error?.description || `Razorpay ${res.status}`);
      err.provider = 'razorpay';
      err.statusCode = res.status;
      throw err;
    }
    return json;
  }

  return {
    provider: 'razorpay',
    capability: 'payment',
    publicKey: keyId, // safe to hand to the client

    /** @param {number} amount integer paise */
    async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
      const order = await call('/orders', {
        method: 'POST',
        body: { amount, currency, receipt, notes, payment_capture: 1 },
      });
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        provider: 'razorpay',
      };
    },

    /**
     * Verify the webhook signature. MUST be called with the RAW request body — a
     * re-serialised object will not match the HMAC.
     */
    verifyWebhookSignature(rawBody, signature) {
      if (!webhookSecret) {
        logger.error('Razorpay webhook secret is not configured — rejecting webhook');
        return false;
      }
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const a = Buffer.from(expected);
      const b = Buffer.from(String(signature || ''));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },

    /** Verify the checkout handler signature returned to the browser. */
    verifyPaymentSignature({ orderId, paymentId, signature }) {
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(String(signature || ''));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },

    parseWebhook(body) {
      const entity = body?.payload?.payment?.entity ?? {};
      return {
        event: body?.event,
        paymentId: entity.id,
        orderId: entity.order_id,
        amount: entity.amount, // paise
        status: entity.status,
        method: entity.method,
        email: entity.email,
        contact: entity.contact,
        errorDescription: entity.error_description,
      };
    },

    fetchPayment(paymentId) {
      return call(`/payments/${paymentId}`);
    },

    async refund({ paymentId, amount, notes = {} }) {
      const r = await call(`/payments/${paymentId}/refund`, {
        method: 'POST',
        body: { amount, notes },
      });
      return { id: r.id, paymentId, amount: r.amount, status: r.status, provider: 'razorpay' };
    },

    /** Settlement report — the input to bank reconciliation (verification C6). */
    fetchSettlements({ from, to, count = 100 }) {
      const params = new URLSearchParams({
        from: String(Math.floor(new Date(from).getTime() / 1000)),
        to: String(Math.floor(new Date(to).getTime() / 1000)),
        count: String(count),
      });
      return call(`/settlements?${params}`);
    },
  };
}

module.exports = { create };
