import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { Track, TrackSchema } from '../tracks/schemas/track.schema';
import { CoupleRoom, CoupleRoomSchema } from '../couple/schemas/couple-room.schema';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Track.name, schema: TrackSchema },
            { name: CoupleRoom.name, schema: CoupleRoomSchema },
        ]),
        EventsModule,
    ],
    controllers: [PlayerController],
    providers: [PlayerService],
    exports: [PlayerService],
})
export class PlayerModule { }
