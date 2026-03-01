import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';
import { Track, TrackSchema } from './schemas/track.schema';
import { CoupleRoom, CoupleRoomSchema } from '../couple/schemas/couple-room.schema'; // Correct import
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Track.name, schema: TrackSchema },
            { name: CoupleRoom.name, schema: CoupleRoomSchema }, // Load CoupleRoom schema
        ]),
        BullModule.registerQueue({
            name: 'audio-convert', // Register a BullMQ queue
        }),
        EventsModule,
    ],
    controllers: [TracksController],
    providers: [TracksService],
    exports: [TracksService],
})
export class TracksModule { }
