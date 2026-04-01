import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { Track, TrackSchema } from '../tracks/schemas/track.schema';
import { CoupleRoom, CoupleRoomSchema } from '../couple/schemas/couple-room.schema';
import { VideoRoom, VideoRoomSchema } from '../events/schemas/video-room.schema';
import { EventsModule } from '../events/events.module';
import { NotificationModule } from '../notification/notification.module';
import { StreakModule } from '../streak/streak.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Track.name, schema: TrackSchema },
            { name: CoupleRoom.name, schema: CoupleRoomSchema },
            { name: VideoRoom.name, schema: VideoRoomSchema },
        ]),
        EventsModule,
        NotificationModule,
        StreakModule,
        BullModule.registerQueue({
            name: 'audio-convert',
        }),
    ],
    controllers: [PlayerController],
    providers: [PlayerService],
    exports: [PlayerService],
})
export class PlayerModule { }
