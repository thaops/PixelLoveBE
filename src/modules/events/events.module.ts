import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsGateway } from './events.gateway';
import { User, UserSchema } from '../user/schemas/user.schema';
import { getJwtConfig } from '../../config/jwt.config';

/**
 * Events Module
 * Handles WebSocket real-time communication
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}

