import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { CoupleRoom, CoupleRoomSchema } from '../couple/schemas/couple-room.schema';
import { EventsModule } from '../events/events.module';

/**
 * User Module
 * Manages user profiles and settings
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CoupleRoom.name, schema: CoupleRoomSchema },
    ]),
    EventsModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

