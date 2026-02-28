import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetController } from './pet.controller';
import { PetService } from './pet.service';
import { Pet, PetSchema } from './schemas/pet.schema';
import { PetAction, PetActionSchema } from './schemas/pet-action.schema';
import { PetReaction, PetReactionSchema } from './schemas/pet-reaction.schema';
import { Streak, StreakSchema } from '../streak/schemas/streak.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { CoupleModule } from '../couple/couple.module';
import { AlbumModule } from '../album/album.module';
import { EventsModule } from '../events/events.module';
import { StreakModule } from '../streak/streak.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * Pet Module
 * Handles pet progression with petting/image actions
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: PetAction.name, schema: PetActionSchema },
      { name: Streak.name, schema: StreakSchema },
      { name: PetReaction.name, schema: PetReactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => CoupleModule),
    AlbumModule,
    EventsModule,
    StreakModule,
    NotificationModule,
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService],
})
export class PetModule { }

