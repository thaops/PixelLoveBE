import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { FridgeNote, FridgeNoteSchema } from './schemas/fridge-note.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { EventsModule } from '../events/events.module';
import { StreakModule } from '../streak/streak.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * Fridge Module
 * Handles Home - Fridge feature (notes on fridge)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FridgeNote.name, schema: FridgeNoteSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EventsModule,
    StreakModule,
    NotificationModule,
  ],
  controllers: [FridgeController],
  providers: [FridgeService],
  exports: [FridgeService],
})
export class FridgeModule { }
