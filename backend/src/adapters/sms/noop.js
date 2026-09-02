/**
 * No-op SMS driver — the default.
 *
 * Architecture §12.3: development runs the whole system with zero credentials while
 * logging what WOULD have been sent, so a missing provider never blocks a feature and
 * never silently swallows a message either.
 */
const crypto = require('crypto');
const logger = require('../../config/logger');

function create(settings, ctx = {}) {
  return {
    provider: 'noop',
    capability: 'sms',

    async send({ to, message, dltTemplateId, templateId, params }) {
      const id = `noop_${crypto.randomBytes(8).toString('hex')}`;
      logger.info('[noop:sms] would send', {
        to,
        templateId,
        dltTemplateId,
        params,
        preview: message?.slice(0, 120),
        tenantId: ctx.tenantId,
      });
      return { id, status: 'sent', provider: 'noop', cost: 0, simulated: true };
    },

    async status() {
      return { status: 'delivered', simulated: true };
    },
  };
}

module.exports = { create };
