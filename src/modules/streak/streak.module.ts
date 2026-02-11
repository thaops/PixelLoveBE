import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreakService } from './streak.service';
import { StreakController } from './streak.controller';
import { Streak, StreakSchema } from './schemas/streak.schema';
import { CoupleRoom, CoupleRoomSchema } from '../couple/schemas/couple-room.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Streak.name, schema: StreakSchema },
            { name: CoupleRoom.name, schema: CoupleRoomSchema },
        ]),
        NotificationModule,
    ],
    controllers: [StreakController],
    providers: [StreakService],
    exports: [StreakService],
})
export class StreakModule { }
