/**
 * Seed the RBAC model: 12 system roles + ~23 template roles per tenant.
 *
 * Architecture §7.2 / ADR-05. Replaces `seed-permissions.js`, which wrote to the legacy
 * `Permission` collection using a role vocabulary that disagreed with both `User.role` and
 * the `Role` collection.
 *
 * Run:  node src/scripts/seed-rbac.js [--tenant=<slug>] [--govt-aided] [--force]
 */
require('dotenv').config();
const mongoose = require('mongoose');

const { buildMatrix } = require('../platform/rbac/matrix/systemRoles');
const { buildTemplates } = require('../platform/rbac/matrix/templates');
const { invalidateTenant } = require('../platform/rbac/permissionResolver');

require('../models/Role');
require('../models/Tenant');
require('../models/User');
require('../models/UserRole');

const Role = mongoose.model('Role');
const Tenant = mongoose.model('Tenant');

function parseArgs(argv) {
  const args = { tenant: null, govtAided: false, force: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--tenant=')) args.tenant = a.split('=')[1];
    else if (a === '--govt-aided') args.govtAided = true;
    else if (a === '--force') args.force = true;
  }
  return args;
}

/** Upsert one role document from a matrix definition. */
async function upsertRole(def, tenantId, { force }) {
  const filter = { slug: def.slug, tenantId: tenantId ?? null, deletedAt: null };
  const existing = await Role.findOne(filter);

  // Never clobber a school's edits unless explicitly told to.
  if (existing && !force) {
    return { slug: def.slug, action: 'skipped (already exists)' };
  }

  const payload = {
    tenantId: tenantId ?? null,
    name: def.label,
    slug: def.slug,
    description: def.description,
    tier: def.tier,
    isSystem: !!def.isSystem,
    isTemplate: !!def.isTemplate,
    isSuperAdmin: def.slug === 'super_admin',
    matrix: new Map(Object.entries(def.permissions)),
    isActive: true,
    deletedAt: null,
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return { slug: def.slug, action: 'updated' };
  }

  await Role.create(payload);
  return { slug: def.slug, action: 'created' };
}

async function seedSystemRoles(opts) {
  const matrix = buildMatrix();
  const results = [];
  for (const def of Object.values(matrix)) {
    // System roles are global: tenantId null.
    results.push(await upsertRole(def, null, opts));
  }
  return results;
}

async function seedTemplatesForTenant(tenant, opts) {
  const templates = buildTemplates({ includeGovtAided: opts.govtAided });
  const results = [];
  for (const def of Object.values(templates)) {
    results.push(await upsertRole(def, tenant._id, opts));
  }
  invalidateTenant(tenant._id);
  return results;
}

function summarise(results) {
  const counts = results.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
}

async function main() {
  const args = parseArgs(process.argv);
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  console.log('── System roles (global) ──────────────────────────────');
  const sys = await seedSystemRoles(args);
  console.log(`  ${summarise(sys)}`);
  sys.filter((r) => r.action !== 'skipped (already exists)').forEach((r) => {
    console.log(`    ${r.action.padEnd(8)} ${r.slug}`);
  });

  const tenantFilter = { deletedAt: null };
  if (args.tenant) tenantFilter.slug = args.tenant;
  const tenants = await Tenant.find(tenantFilter).select('_id name slug').lean();

  console.log(`\n── Template roles (${tenants.length} tenant(s)) ─────────────────`);
  for (const tenant of tenants) {
    const res = await seedTemplatesForTenant(tenant, args);
    console.log(`  ${tenant.slug.padEnd(20)} ${summarise(res)}`);
  }

  console.log('\nDone.');
  console.log('Next: run `node src/scripts/migrate-user-roles.js` to create role bindings');
  console.log('      for existing users.\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { seedSystemRoles, seedTemplatesForTenant, upsertRole };
