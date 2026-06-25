require('dotenv').config();
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV });
  });

  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
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
