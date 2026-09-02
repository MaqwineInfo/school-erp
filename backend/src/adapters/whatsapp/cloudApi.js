/**
 * WhatsApp Business Cloud API driver.
 *
 * Template-only sends: outside the 24-hour customer service window Meta rejects freeform
 * messages, so the adapter refuses them up front rather than surfacing a confusing
 * provider error (specification §14.2 — "approved message templates").
 */
const logger = require('../../config/logger');
const { BusinessRuleError } = require('../../shared/errors');

const GRAPH = 'https://graph.facebook.com/v20.0';

function create(settings, ctx = {}) {
  const { apiKey, fromNumber: phoneNumberId } = settings;
  if (!apiKey || !phoneNumberId) {
    throw new Error('whatsapp cloud_api driver requires apiKey and fromNumber (phone number id)');
  }

  async function post(payload) {
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      logger.error('WhatsApp send failed', { status: res.status, body, tenantId: ctx.tenantId });
      return { id: null, status: 'failed', provider: 'cloud_api', error: body?.error?.message };
    }
    return { id: body.messages?.[0]?.id ?? null, status: 'sent', provider: 'cloud_api', raw: body };
  }

  return {
    provider: 'cloud_api',
    capability: 'whatsapp',

    async send({ to, templateName, languageCode = 'en', params = [], mediaUrl, isSessionReply }) {
      if (!templateName && !isSessionReply) {
        throw new BusinessRuleError(
          'WhatsApp requires an approved template outside the 24-hour session window',
        );
      }

      if (isSessionReply) {
        return post({ to, type: 'text', text: { body: params[0] ?? '' } });
      }

      const components = [];
      if (mediaUrl) {
        components.push({
          type: 'header',
          parameters: [{ type: 'document', document: { link: mediaUrl } }],
        });
      }
      if (params.length) {
        components.push({
          type: 'body',
          parameters: params.map((p) => ({ type: 'text', text: String(p) })),
        });
      }

      return post({
        to,
        type: 'template',
        template: { name: templateName, language: { code: languageCode }, components },
      });
    },

    /** Meta pushes delivery receipts to a webhook; this verifies the subscription. */
    verifyWebhook(query, verifyToken) {
      if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken) {
        return { ok: true, challenge: query['hub.challenge'] };
      }
      return { ok: false };
    },
  };
}

module.exports = { create };
