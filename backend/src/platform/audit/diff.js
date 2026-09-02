/**
 * Field-level diffing for the audit trail, with redaction.
 * Architecture §15.1.
 */

/** Never written to an audit row, even in a "before" snapshot. */
const REDACTED_FIELDS = new Set([
  'password',
  'passwordHash',
  'passwordResetToken',
  'mfa.secret',
  'mfa.backupCodes',
  'secret',
  'apiKey',
  'keySecret',
  'authKey',
  'webhookSecret',
  'tokenHash',
  'aadhaarHash',
  'aadhaarNumber',
]);

const REDACTION = '[redacted]';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

function normalise(v) {
  if (v === undefined) return null;
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && v._bsontype === 'ObjectId') return String(v);
  if (Array.isArray(v)) return v.map(normalise);
  if (isPlainObject(v)) {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = normalise(val);
    return out;
  }
  return v;
}

function equal(a, b) {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

function shouldRedact(path) {
  if (REDACTED_FIELDS.has(path)) return true;
  const leaf = path.split('.').pop();
  return REDACTED_FIELDS.has(leaf);
}

/**
 * Compute a flat list of changed fields.
 * @returns {Array<{field: string, from: any, to: any}>}
 */
function computeDiff(before, after, { prefix = '', maxDepth = 4 } = {}) {
  const changes = [];

  const b = before ?? {};
  const a = after ?? {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);

  for (const key of keys) {
    if (key === '_id' || key === '__v' || key === 'updatedAt') continue;

    const path = prefix ? `${prefix}.${key}` : key;
    const from = b[key];
    const to = a[key];

    if (equal(from, to)) continue;

    if (shouldRedact(path)) {
      changes.push({ field: path, from: REDACTION, to: REDACTION });
      continue;
    }

    // Recurse one level into nested objects so `settings.gstEnabled` reads sensibly.
    if (isPlainObject(from) && isPlainObject(to) && prefix.split('.').length < maxDepth) {
      changes.push(...computeDiff(from, to, { prefix: path, maxDepth }));
      continue;
    }

    changes.push({ field: path, from: normalise(from), to: normalise(to) });
  }

  return changes;
}

/** Strip secrets out of a full snapshot before it is stored. */
function redactSnapshot(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  const walk = (obj, prefix = '') => {
    if (!isPlainObject(obj)) return normalise(obj);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (shouldRedact(path)) out[k] = REDACTION;
      else if (isPlainObject(v)) out[k] = walk(v, path);
      else out[k] = normalise(v);
    }
    return out;
  };
  return walk(plain);
}

module.exports = { computeDiff, redactSnapshot, normalise, equal, REDACTED_FIELDS, REDACTION };
