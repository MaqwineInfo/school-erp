const crypto = require('crypto');
const logger = require('../../config/logger');

function create(settings, ctx = {}) {
  return {
    provider: 'noop',
    capability: 'push',

    async send({ tokens = [], title, body, data = {} }) {
      const id = `noop_${crypto.randomBytes(8).toString('hex')}`;
      logger.info('[noop:push] would send', {
        recipients: tokens.length,
        title,
        preview: body?.slice(0, 120),
        data,
        tenantId: ctx.tenantId,
      });
      return { id, status: 'sent', provider: 'noop', successCount: tokens.length, simulated: true };
    },
  };
}

module.exports = { create };
