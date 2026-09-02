/**
 * Migration runner.
 *
 * Architecture §19. The project previously had NO migration system at all — the schema
 * evolved by editing Mongoose files and re-running seeds, which cannot be done safely
 * against a live tenant.
 *
 * Migrations are ordered by filename, tracked in a `Migration` collection, and idempotent.
 *
 * Run:  node src/migrations/runner.js [up|down|status] [--to=<id>]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const migrationSchema = new mongoose.Schema(
  {
    migrationId: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
    durationMs: { type: Number },
    result: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

const Migration = mongoose.models.Migration || mongoose.model('Migration', migrationSchema);

/** Load every migration module in filename order. */
function loadMigrations() {
  const dir = __dirname;
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}-.*\.js$/.test(f))
    .sort()
    .map((f) => {
      const mod = require(path.join(dir, f));
      if (!mod.id || typeof mod.up !== 'function') {
        throw new Error(`Migration ${f} must export { id, up }`);
      }
      return { file: f, ...mod };
    });
}

/** Every model must be registered before a migration touches it. */
function registerModels() {
  const modelsDir = path.join(__dirname, '..', 'models');
  fs.readdirSync(modelsDir)
    .filter((f) => f.endsWith('.js'))
    .forEach((f) => {
      require(path.join(modelsDir, f));
    });
}

async function status() {
  const applied = await Migration.find().select('migrationId appliedAt').lean();
  const appliedIds = new Set(applied.map((a) => a.migrationId));
  return loadMigrations().map((m) => ({
    id: m.id,
    file: m.file,
    applied: appliedIds.has(m.id),
    appliedAt: applied.find((a) => a.migrationId === m.id)?.appliedAt ?? null,
  }));
}

async function up({ to } = {}) {
  registerModels();
  const migrations = loadMigrations();
  const applied = new Set((await Migration.find().select('migrationId').lean()).map((a) => a.migrationId));

  const results = [];

  for (const m of migrations) {
    if (applied.has(m.id)) {
      results.push({ id: m.id, status: 'already applied' });
      continue;
    }

    const started = Date.now();
    const result = await m.up({});
    const durationMs = Date.now() - started;

    await Migration.create({ migrationId: m.id, durationMs, result });
    results.push({ id: m.id, status: 'applied', durationMs, result });

    if (to && m.id === to) break;
  }

  return results;
}

async function down({ to } = {}) {
  registerModels();
  const migrations = loadMigrations().reverse();
  const applied = new Set((await Migration.find().select('migrationId').lean()).map((a) => a.migrationId));

  const results = [];
  for (const m of migrations) {
    if (!applied.has(m.id)) continue;
    if (typeof m.down !== 'function') {
      results.push({ id: m.id, status: 'no down migration — skipped' });
      continue;
    }
    const result = await m.down({});
    await Migration.deleteOne({ migrationId: m.id });
    results.push({ id: m.id, status: 'reverted', result });
    if (to && m.id === to) break;
  }
  return results;
}

async function main() {
  const command = process.argv[2] || 'up';
  const toArg = process.argv.find((a) => a.startsWith('--to='));
  const to = toArg ? toArg.split('=')[1] : undefined;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  if (command === 'status') {
    console.table(await status());
  } else if (command === 'down') {
    console.table(await down({ to }));
  } else {
    console.table(await up({ to }));
  }

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { up, down, status, loadMigrations, Migration };
