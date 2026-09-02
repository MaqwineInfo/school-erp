/**
 * Symmetric encryption for tenant integration credentials.
 *
 * Architecture §12.3 / §15. `Tenant.integrations` currently stores Razorpay keys, MSG91
 * auth keys, WhatsApp tokens and SMTP passwords in PLAINTEXT. Anything written through
 * this helper is AES-256-GCM encrypted at rest and is never returned by an API.
 */
const crypto = require('crypto');
const config = require('../../config/env');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/** Derive a stable 32-byte key from the configured secret. */
function key() {
  return crypto.createHash('sha256').update(String(config.crypto.secretKey)).digest();
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // idempotent

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return PREFIX + [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

function decrypt(value) {
  if (!isEncrypted(value)) return value;

  const [ivB64, tagB64, dataB64] = String(value).slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Encrypt every string leaf of a credential object. */
function encryptObject(obj, secretKeys) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (secretKeys && !secretKeys.includes(k)) continue;
    if (typeof out[k] === 'string') out[k] = encrypt(out[k]);
  }
  return out;
}

function decryptObject(obj, secretKeys) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (secretKeys && !secretKeys.includes(k)) continue;
    if (typeof out[k] === 'string') out[k] = decrypt(out[k]);
  }
  return out;
}

/** Mask a credential for display: keeps the last 4 characters. */
function mask(value, keep = 4) {
  if (!value) return '';
  const s = isEncrypted(value) ? decrypt(value) : String(value);
  if (s.length <= keep) return '•'.repeat(s.length);
  return '•'.repeat(Math.min(s.length - keep, 12)) + s.slice(-keep);
}

/**
 * One-way hash for identifiers that must be searchable but never readable —
 * Aadhaar in particular (architecture §15.3 / ADR-13).
 */
function blindIndex(value) {
  return crypto
    .createHmac('sha256', key())
    .update(String(value).replace(/\s/g, ''))
    .digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptObject,
  decryptObject,
  mask,
  blindIndex,
};
