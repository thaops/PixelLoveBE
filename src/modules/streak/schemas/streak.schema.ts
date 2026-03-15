import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StreakDocument = Streak & Document;

@Schema({ timestamps: true })
export class Streak {
    @Prop({ required: true, unique: true })
    coupleId: string;

    @Prop({ default: 0 })
    currentDays: number;

    @Prop({ type: Date, default: null })
    lastInteractionA: Date | null;

    @Prop({ type: Date, default: null })
    lastInteractionB: Date | null;

    @Prop({ type: String, default: null })
    lastCountedDate: string | null; // yyyy-mm-dd format

    @Prop({ type: Date, default: null })
    lastRestoredAt: Date | null;

    @Prop({ default: 0 })
    brokenStreakDays: number;
}

export const StreakSchema = SchemaFactory.createForClass(Streak);
