import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import Redis from 'ioredis';
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
import { YoutubeModule } from './modules/youtube/youtube.module';

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
        const port = typeof portValue === 'string' ? parseInt(portValue, 10) : portValue;

        if (redisUrl) {
          return {
            connection: new Redis(redisUrl, {
              maxRetriesPerRequest: null,
            }),
          };
        }

        return {
          connection: {
            host: (host === 'localhost' || !host) ? '127.0.0.1' : host,
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
    YoutubeModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
