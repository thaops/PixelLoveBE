import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoupleController } from './couple.controller';
import { CoupleService } from './couple.service';
import { CoupleRoom, CoupleRoomSchema } from './schemas/couple-room.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { UserModule } from '../user/user.module';
import { EventsModule } from '../events/events.module';

/**
 * Couple Module
 * Manages couple rooms and relationships
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoupleRoom.name, schema: CoupleRoomSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UserModule,
    EventsModule,
  ],
  controllers: [CoupleController],
  providers: [CoupleService],
  exports: [CoupleService],
})
export class CoupleModule {}

