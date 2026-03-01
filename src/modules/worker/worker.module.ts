import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Track, TrackSchema } from '../tracks/schemas/track.schema';
import { BullModule } from '@nestjs/bullmq';
import { AudioConvertWorker } from './audio-convert.worker';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Track.name, schema: TrackSchema }]),
        BullModule.registerQueue({
            name: 'audio-convert',
        }),
        EventsModule,
    ],
    providers: [AudioConvertWorker],
})
export class WorkerModule { }
