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
        if (redisUrl) {
          try {
            // Ensure protocol exists for URL parser
            const normalizedUrl = redisUrl.includes('://') ? redisUrl : `redis://${redisUrl}`;
            const parsed = new URL(normalizedUrl);
            const port = parseInt(parsed.port, 10);
            return {
              connection: {
                host: parsed.hostname || 'red-d6ihrupaae7s73cgra80',
                port: isNaN(port) ? 6379 : port,
                username: parsed.username || undefined,
                password: parsed.password || undefined,
                maxRetriesPerRequest: null,
                tls: normalizedUrl.startsWith('rediss://') ? {} : undefined,
              },
            };
          } catch (e) {
            console.error('Failed to parse REDIS_URL, falling back to host/port config');
          }
        }

        const host = configService.get('REDIS_HOST', '127.0.0.1');
        const portValue = configService.get('REDIS_PORT', '6379');
        const port = parseInt(portValue.toString(), 10);

        return {
          connection: {
            host: host || '127.0.0.1',
            port: isNaN(port) ? 6379 : port,
            maxRetriesPerRequest: null,
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
