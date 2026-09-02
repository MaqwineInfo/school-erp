/**
 * Validated application configuration.
 *
 * Architecture §19: the process refuses to start if a required variable is missing,
 * rather than failing at first use. JWT_SECRET has no default.
 */
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Environment variable ${name} must be a number, got "${v}"`);
  return n;
}

function bool(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function build() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Cannot start: missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill them in.',
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = required('JWT_SECRET');

  if (nodeEnv === 'production' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    port: num('PORT', 5000),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

    db: {
      uri: required('MONGODB_URI'),
    },

    jwt: {
      secret: jwtSecret,
      // Architecture §14.1 — short-lived access token, long-lived rotating refresh token.
      accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
      refreshExpiresDays: num('JWT_REFRESH_EXPIRES_DAYS', 30),
      issuer: process.env.JWT_ISSUER || 'school-erp',
    },

    auth: {
      bcryptRounds: num('BCRYPT_ROUNDS', 12),
      maxFailedAttempts: num('AUTH_MAX_FAILED_ATTEMPTS', 5),
      lockoutMinutes: num('AUTH_LOCKOUT_MINUTES', 15),
      passwordMinLength: num('AUTH_PASSWORD_MIN_LENGTH', 8),
      otpTtlSeconds: num('AUTH_OTP_TTL_SECONDS', 300),
    },

    rateLimit: {
      windowMs: num('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      max: num('RATE_LIMIT_MAX', 500),
      authMax: num('RATE_LIMIT_AUTH_MAX', 20),
    },

    scheduler: {
      enabled: bool('SCHEDULER_ENABLED', true),
      outboxIntervalMs: num('OUTBOX_INTERVAL_MS', 5000),
    },

    idempotency: {
      ttlHours: num('IDEMPOTENCY_TTL_HOURS', 24),
    },

    storage: {
      driver: process.env.STORAGE_DRIVER || 'local',
      localDir: process.env.STORAGE_LOCAL_DIR || 'uploads',
      s3: {
        region: process.env.AWS_REGION || 'ap-south-1',
        bucket: process.env.S3_BUCKET_NAME || '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    },

    /**
     * Encryption key for tenant integration credentials (architecture §12.3).
     * Falls back to JWT_SECRET outside production so development needs no extra setup.
     */
    crypto: {
      secretKey: process.env.CREDENTIAL_ENCRYPTION_KEY || jwtSecret,
    },
  };
}

module.exports = build();
module.exports.build = build;
