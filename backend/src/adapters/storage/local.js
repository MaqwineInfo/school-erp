/**
 * Local filesystem storage — the development default.
 *
 * Mirrors the S3 driver's interface including signed URLs (HMAC-signed query strings
 * validated by the file-serving route), so code written against local storage works
 * unchanged against S3.
 */
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/env');

function create(settings = {}) {
  const root = path.resolve(process.cwd(), settings.localDir || config.storage.localDir);
  if (!fsSync.existsSync(root)) fsSync.mkdirSync(root, { recursive: true });

  const signingKey = crypto
    .createHash('sha256')
    .update(String(config.crypto.secretKey))
    .digest();

  function safeJoin(key) {
    // Prevent path traversal out of the storage root.
    const target = path.resolve(root, key);
    if (!target.startsWith(root)) throw new Error('Invalid storage key');
    return target;
  }

  function sign(key, expiresAt) {
    return crypto
      .createHmac('sha256', signingKey)
      .update(`${key}:${expiresAt}`)
      .digest('hex');
  }

  return {
    provider: 'local',
    capability: 'storage',

    async put({ key, body, contentType }) {
      const target = safeJoin(key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, body);
      return { key, size: body.length, contentType, provider: 'local' };
    },

    async get(key) {
      return fs.readFile(safeJoin(key));
    },

    async remove(key) {
      await fs.unlink(safeJoin(key)).catch(() => {});
      return { key, deleted: true };
    },

    async exists(key) {
      try {
        await fs.access(safeJoin(key));
        return true;
      } catch {
        return false;
      }
    },

    /** Architecture §14.3 — documents are never served directly from the app process. */
    getSignedUrl(key, { expiresInSeconds = 3600 } = {}) {
      const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const sig = sign(key, expiresAt);
      return `/api/v1/files/${encodeURIComponent(key)}?expires=${expiresAt}&sig=${sig}`;
    },

    verifySignedUrl(key, expires, sig) {
      if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
      const expected = sign(key, expires);
      const a = Buffer.from(expected);
      const b = Buffer.from(String(sig || ''));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };
}

module.exports = { create };
