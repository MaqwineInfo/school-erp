/**
 * Adapter registry — resolves the right provider driver for a tenant and capability.
 *
 * Architecture §12 / ADR-09. Nothing in `modules/` ever imports a provider SDK; it asks
 * the registry for a capability and gets an object implementing a fixed interface.
 *
 * `noop` is the default for every capability, so a fresh development database runs the
 * entire system with zero credentials while logging what WOULD have been sent.
 */
const mongoose = require('mongoose');
const logger = require('../config/logger');
const config = require('../config/env');
const { decryptObject } = require('../platform/crypto/secrets');
const { tenantCache } = require('../infra/cache/versionedCache');

/** capability → { drivers, secretKeys, tenantPath } */
const CAPABILITIES = {
  payment: {
    drivers: () => ({
      razorpay: require('./payment/razorpay'),
      noop: require('./payment/noop'),
    }),
    tenantPath: 'razorpay',
    secretKeys: ['keyId', 'keySecret', 'webhookSecret'],
  },
  sms: {
    drivers: () => ({
      msg91: require('./sms/msg91'),
      noop: require('./sms/noop'),
    }),
    tenantPath: 'msg91',
    secretKeys: ['authKey'],
  },
  whatsapp: {
    drivers: () => ({
      cloud_api: require('./whatsapp/cloudApi'),
      noop: require('./whatsapp/noop'),
    }),
    tenantPath: 'whatsapp',
    secretKeys: ['apiKey'],
  },
  email: {
    drivers: () => ({
      smtp: require('./email/smtp'),
      noop: require('./email/noop'),
    }),
    tenantPath: 'smtp',
    secretKeys: ['pass'],
  },
  push: {
    drivers: () => ({
      fcm: require('./push/fcm'),
      noop: require('./push/noop'),
    }),
    tenantPath: 'fcm',
    secretKeys: ['serverKey'],
  },
  storage: {
    drivers: () => ({
      s3: require('./storage/s3'),
      local: require('./storage/local'),
    }),
    tenantPath: null, // storage is platform-level, not per tenant
    secretKeys: [],
  },
};

async function tenantIntegrations(tenantId) {
  if (!tenantId) return {};
  return tenantCache.wrap('tenant:integrations', String(tenantId), async () => {
    const Tenant = mongoose.model('Tenant');
    const t = await Tenant.findById(tenantId).select('integrations name').lean();
    return t?.integrations ?? {};
  });
}

/**
 * Get a driver for a capability.
 *
 * @param {string} capability payment | sms | whatsapp | email | push | storage
 * @param {object} [opts] { tenantId }
 */
async function forTenant(capability, { tenantId } = {}) {
  const spec = CAPABILITIES[capability];
  if (!spec) throw new Error(`Unknown adapter capability "${capability}"`);

  const drivers = spec.drivers();

  // Platform-level capability (storage) — configured by environment, not per tenant.
  if (!spec.tenantPath) {
    const name = config.storage.driver;
    const driver = drivers[name] || drivers.local;
    return driver.create(config.storage, { capability, provider: name });
  }

  const integrations = await tenantIntegrations(tenantId);
  const raw = integrations?.[spec.tenantPath] ?? {};

  /**
   * An integration counts as configured only when it is EXPLICITLY enabled.
   * Testing for "has any keys" is wrong: the Tenant schema gives each integration a
   * default `provider`, so an untouched sub-document is non-empty and a fresh tenant
   * would be routed at a real provider with no credentials.
   */
  const enabled = raw.enabled === true;

  const providerName = enabled ? raw.provider || spec.tenantPath : 'noop';
  const driver = drivers[providerName] || drivers.noop;

  if (!enabled || driver === drivers.noop) {
    return drivers.noop.create({}, { capability, provider: 'noop', tenantId });
  }

  const settings = decryptObject(raw, spec.secretKeys);
  return driver.create(settings, { capability, provider: providerName, tenantId });
}

/**
 * Startup guard. Architecture §12.3: production must not boot with a `noop` driver on a
 * capability an enabled module depends on. Reports rather than throws, so a partially
 * configured tenant does not take down the whole platform.
 */
async function assertProductionReadiness() {
  if (!config.isProduction) return { ok: true, warnings: [] };

  const Tenant = mongoose.model('Tenant');
  const tenants = await Tenant.find({ status: 'active', deletedAt: null })
    .select('name slug enabledModules integrations')
    .lean();

  const warnings = [];
  for (const t of tenants) {
    const need = [];
    if ((t.enabledModules || []).includes('fees')) need.push(['payment', 'razorpay']);
    if ((t.enabledModules || []).includes('communication')) need.push(['sms', 'msg91']);

    for (const [capability, path] of need) {
      if (!t.integrations?.[path]?.enabled) {
        warnings.push(`${t.slug}: ${capability} is not configured but the module is enabled`);
      }
    }
  }

  if (warnings.length) logger.warn('Adapter readiness warnings', { warnings });
  return { ok: warnings.length === 0, warnings };
}

function invalidateTenantIntegrations() {
  tenantCache.bump('tenant:integrations');
}

module.exports = { forTenant, assertProductionReadiness, invalidateTenantIntegrations, CAPABILITIES };
