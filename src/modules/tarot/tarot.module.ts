import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TarotController } from './tarot.controller';
import { TarotService } from './tarot.service';
import { TarotAiService } from './tarot-ai.service';
import { TarotCron } from './tarot.cron';
import { DailyTarot, DailyTarotSchema } from './schemas/tarot.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { NotificationModule } from '../notification/notification.module';
import { StreakModule } from '../streak/streak.module';
import { EventsModule } from '../events/events.module';
import { CoupleRoom, CoupleRoomSchema } from '../couple/schemas/couple-room.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DailyTarot.name, schema: DailyTarotSchema },
            { name: User.name, schema: UserSchema },
            { name: CoupleRoom.name, schema: CoupleRoomSchema },
        ]),
        NotificationModule,
        StreakModule,
        EventsModule,
    ],
    controllers: [TarotController],
    providers: [TarotService, TarotAiService, TarotCron],
    exports: [TarotService],
})
export class TarotModule { }
