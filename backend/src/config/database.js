const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) is not set in environment variables');

  // Before connecting, so that any `mongoose.model('X')` by-name lookup resolves. Several
  // models are only ever referenced that way and would otherwise never be registered.
  require('../models');

  await mongoose.connect(uri);
  logger.info(`MongoDB connected — db: ${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

module.exports = { connectDatabase, disconnectDatabase };
