/**
 * MSG91 SMS driver.
 *
 * Enforces TRAI/DLT compliance at the ADAPTER (architecture §12.2): a send without a
 * registered DLT template id is rejected here rather than being silently dropped by the
 * carrier, which is how DLT failures usually become invisible.
 */
const logger = require('../../config/logger');
const { BusinessRuleError } = require('../../shared/errors');

const BASE_URL = 'https://control.msg91.com/api/v5';

function create(settings, ctx = {}) {
  const { authKey, senderId } = settings;
  if (!authKey) throw new Error('msg91 driver requires an authKey');

  return {
    provider: 'msg91',
    capability: 'sms',

    async send({ to, templateId, dltTemplateId, params = {}, message }) {
      if (!dltTemplateId && !templateId) {
        throw new BusinessRuleError(
          'An SMS requires a DLT-registered template id (TRAI compliance). ' +
            'Register the template and store its id before sending.',
        );
      }

      const recipients = (Array.isArray(to) ? to : [to]).map((n) => ({
        mobiles: normaliseIndianNumber(n),
        ...params,
      }));

      const res = await fetch(`${BASE_URL}/flow/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: authKey },
        body: JSON.stringify({
          template_id: dltTemplateId || templateId,
          sender: senderId,
          short_url: '0',
          recipients,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || body.type === 'error') {
        logger.error('MSG91 send failed', { status: res.status, body, tenantId: ctx.tenantId });
        return { id: null, status: 'failed', provider: 'msg91', error: body.message || `HTTP ${res.status}` };
      }

      return { id: body.request_id ?? null, status: 'sent', provider: 'msg91', raw: body };
    },

    async status(requestId) {
      const res = await fetch(`${BASE_URL}/report/logs/p/${requestId}`, {
        headers: { authkey: authKey },
      });
      const body = await res.json().catch(() => ({}));
      return { status: body?.data?.[0]?.status ?? 'unknown', raw: body };
    },
  };
}

/** MSG91 wants 91XXXXXXXXXX with no plus sign. */
function normaliseIndianNumber(n) {
  const digits = String(n).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

module.exports = { create, normaliseIndianNumber };
