const crypto = require('crypto');
const logger = require('../../config/logger');

function create(settings, ctx = {}) {
  return {
    provider: 'noop',
    capability: 'whatsapp',

    async send({ to, templateName, params, mediaUrl, body }) {
      const id = `noop_${crypto.randomBytes(8).toString('hex')}`;
      logger.info('[noop:whatsapp] would send', {
        to,
        templateName,
        params,
        mediaUrl,
        preview: body?.slice(0, 120),
        tenantId: ctx.tenantId,
      });
      return { id, status: 'sent', provider: 'noop', simulated: true };
    },

    async status() {
      return { status: 'delivered', simulated: true };
    },
  };
}

module.exports = { create };
