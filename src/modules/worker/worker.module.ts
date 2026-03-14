import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Track, TrackSchema } from '../tracks/schemas/track.schema';
// @ts-ignore
import { BullModule } from '@nestjs/bullmq';
import { AudioConvertWorker } from './audio-convert.worker';
import { EventsModule } from '../events/events.module';
import { CleanupService } from './cleanup.service';
import { YoutubeModule } from '../youtube/youtube.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Track.name, schema: TrackSchema }]),
        BullModule.registerQueue({
            name: 'audio-convert',
        }),
        EventsModule,
        YoutubeModule,
    ],
    providers: [AudioConvertWorker, CleanupService],
})
export class WorkerModule { }
