import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrackDocument = Track & Document;

@Schema({ timestamps: true })
export class Track {
    @Prop({ type: Types.ObjectId, required: true, ref: 'CoupleRoom' })
    roomId: Types.ObjectId;

    @Prop({ required: true })
    youtubeVideoId: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    thumbnail: string;

    @Prop({ required: true })
    duration: number; // in seconds

    @Prop({ default: null })
    audioUrl: string;

    @Prop({
        required: true,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing',
    })
    status: string;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    addedBy: Types.ObjectId;
}

export const TrackSchema = SchemaFactory.createForClass(Track);

// Indexes
TrackSchema.index({ roomId: 1, status: 1 });
TrackSchema.index({ createdAt: -1 });
