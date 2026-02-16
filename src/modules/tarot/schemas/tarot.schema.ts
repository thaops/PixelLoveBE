import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyTarotDocument = DailyTarot & Document;

@Schema({ timestamps: true })
export class DailyTarot {
    @Prop({ required: true, index: true })
    coupleId: string;

    @Prop({ required: true, index: true })
    date: string; // YYYY-MM-DD

    @Prop()
    userAId: string;

    @Prop()
    userBId: string;

    @Prop()
    userACard: number; // 1-3

    @Prop()
    userBCard: number; // 1-3

    @Prop()
    userASelectedAt: Date;

    @Prop()
    userBSelectedAt: Date;

    @Prop()
    readyAt: Date;

    @Prop()
    revealedAt: Date;

    @Prop()
    resultText: string;

    @Prop()
    resultQuestion: string;

    @Prop({ default: false })
    aiGenerated: boolean;

    @Prop({ default: false })
    aiGenerating: boolean;

    @Prop({ default: false })
    aiError: boolean;

    @Prop({ default: false })
    streakApplied: boolean;

    @Prop({ default: false })
    expired: boolean;
}

export const DailyTarotSchema = SchemaFactory.createForClass(DailyTarot);

DailyTarotSchema.index({ coupleId: 1, date: 1 }, { unique: true });
DailyTarotSchema.index({ date: 1 });
