import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getMongoConfig } from './config/mongo.config';

// Import all feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CoupleModule } from './modules/couple/couple.module';
import { PetModule } from './modules/pet/pet.module';
import { AlbumModule } from './modules/album/album.module';
import { HomeModule } from './modules/home/home.module';
import { EventsModule } from './modules/events/events.module';
import { RoomModule } from './modules/room/room.module';
import { BackgroundModule } from './modules/background/background.module';
import { FridgeModule } from './modules/fridge/fridge.module';
import { StreakModule } from './modules/streak/streak.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DeviceModule } from './modules/device/device.module';
import { TarotModule } from './modules/tarot/tarot.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TracksModule } from './modules/tracks/tracks.module';
import { BullModule } from '@nestjs/bullmq';
import { WorkerModule } from './modules/worker/worker.module';
import { PlayerModule } from './modules/player/player.module';

/**
 * App Module
 * Root module that imports all feature modules-
 */
@Module({
  imports: [
    // Configuration module (loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMongoConfig,
    }),

    // BullMQ Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const portValue = configService.get<string | number>('REDIS_PORT', 6379);

        // --- 1. Use REDIS_URL if provided (Highest Priority) ---
        if (redisUrl) {
          try {
            const normalizedUrl = redisUrl.includes('://') ? redisUrl : `redis://${redisUrl}`;
            const parsed = new URL(normalizedUrl);
            const port = parseInt(parsed.port, 10);
            const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';

            console.log(`📡 Connecting to Redis via URL: ${parsed.hostname}`);
            return {
              connection: {
                host: parsed.hostname,
                port: isNaN(port) ? 6379 : port,
                username: parsed.username || undefined,
                password: parsed.password || undefined,
                maxRetriesPerRequest: null,
                tls: normalizedUrl.startsWith('rediss://') ? {} : undefined,
                family: isLocal ? 4 : undefined, // Force IPv4 only for local URLs
              },
            };
          } catch (e) {
            console.error('⚠️ Failed to parse REDIS_URL: ', e.message);
          }
        }

        // --- 2. Use Host/Port fallback (Local dev environment) ---
        const finalHost = (host === 'localhost' || !host) ? '127.0.0.1' : host;
        const port = typeof portValue === 'string' ? parseInt(portValue, 10) : portValue;
        const finalPort = isNaN(port) ? 6379 : port;

        console.log(`🏠 Connecting to Redis (Host/Port): ${finalHost}:${finalPort}`);
        return {
          connection: {
            host: finalHost,
            port: finalPort,
            maxRetriesPerRequest: null,
            family: 4, // Force IPv4 to avoid ::1 issues on Windows
          },
        };
      },
    }),

    // Feature modules
    AuthModule,
    UserModule,
    CoupleModule,
    PetModule,
    AlbumModule,
    HomeModule,
    EventsModule,
    RoomModule,
    BackgroundModule,
    FridgeModule,
    StreakModule,
    NotificationModule,
    DeviceModule,
    TarotModule,
    TracksModule,
    WorkerModule,
    PlayerModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
