/**
 * S3-compatible object storage.
 *
 * `@aws-sdk/client-s3` is loaded lazily, so an install that never uses S3 does not need
 * the dependency and does not fail to boot without it.
 */
const logger = require('../../config/logger');

function create(settings = {}) {
  const { region, bucket, accessKeyId, secretAccessKey, endpoint } = settings.s3 || settings;
  if (!bucket) throw new Error('s3 driver requires a bucket');

  let client = null;
  let sdk = null;

  function load() {
    if (client) return { client, sdk };
    try {
      const s3 = require('@aws-sdk/client-s3');
      const presigner = require('@aws-sdk/s3-request-presigner');
      sdk = { ...s3, ...presigner };
      client = new s3.S3Client({
        region,
        endpoint,
        credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
      });
      return { client, sdk };
    } catch {
      throw new Error(
        'S3 storage is configured but "@aws-sdk/client-s3" and "@aws-sdk/s3-request-presigner" ' +
          'are not installed. Run `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` ' +
          'in backend/, or set STORAGE_DRIVER=local.',
      );
    }
  }

  return {
    provider: 's3',
    capability: 'storage',

    async put({ key, body, contentType }) {
      const { client: c, sdk: s } = load();
      await c.send(
        new s.PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
      );
      return { key, size: body.length, contentType, provider: 's3' };
    },

    async get(key) {
      const { client: c, sdk: s } = load();
      const res = await c.send(new s.GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await res.Body.transformToByteArray());
    },

    async remove(key) {
      const { client: c, sdk: s } = load();
      await c.send(new s.DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return { key, deleted: true };
    },

    async exists(key) {
      const { client: c, sdk: s } = load();
      try {
        await c.send(new s.HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Signed URL. RBAC §6.4 requires bulk export links to expire in 4 hours; callers pass
     * the appropriate window per use case.
     */
    async getSignedUrl(key, { expiresInSeconds = 3600 } = {}) {
      const { client: c, sdk: s } = load();
      try {
        return await s.getSignedUrl(c, new s.GetObjectCommand({ Bucket: bucket, Key: key }), {
          expiresIn: expiresInSeconds,
        });
      } catch (err) {
        logger.error('S3 signed URL failed', { key, error: err.message });
        throw err;
      }
    },
  };
}

module.exports = { create };
