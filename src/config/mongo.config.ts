import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * MongoDB Configuration Factory
 * Provides connection options for Mongoose
 */
export const getMongoConfig = (
  configService: ConfigService,
): MongooseModuleOptions => {
  return {
    uri: configService.get<string>('MONGODB_URI'),
    // Connection pool settings for production
    maxPoolSize: 10,
    minPoolSize: 5,
    // Timeout settings
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };
};

