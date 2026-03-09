import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const connectDb = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongodb.uri);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    throw err;
  }
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
