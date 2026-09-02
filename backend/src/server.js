require('dotenv').config();

// Validate configuration BEFORE anything else, so a missing variable fails at startup
// with a clear message rather than at first use (architecture §19).
const config = require('./config/env');

const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./config/logger');
const scheduler = require('./infra/scheduler/scheduler');
const { coreJobs } = require('./infra/scheduler/coreJobs');
const { supportsTransactions } = require('./platform/uow/unitOfWork');
const { assertProductionReadiness } = require('./adapters/registry');

async function bootstrap() {
  await connectDatabase();

  // A standalone mongod cannot run transactions, and the resulting failure mode is a
  // half-completed payment rather than a visible error. Warn loudly.
  if (!(await supportsTransactions())) {
    const message =
      'MongoDB is NOT running as a replica set — multi-document transactions are unavailable. ' +
      'Fee collection, payroll and enrolment cannot be made atomic. ' +
      'Start mongod with --replSet and run rs.initiate().';
    if (config.isProduction) throw new Error(message);
    logger.warn(message);
  }

  await assertProductionReadiness().catch((err) =>
    logger.warn('Adapter readiness check failed', { error: err.message }),
  );

  // Infrastructure jobs, then each domain module's own (architecture §9).
  require('./modules').wireSubscribers();
  scheduler.registerAll(coreJobs);
  for (const mod of require('./modules')) {
    if (mod.jobs?.length) scheduler.registerAll(mod.jobs);
  }
  scheduler.start();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`, { env: config.nodeEnv });
  });

  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    scheduler.stop();
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server shut down cleanly');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
