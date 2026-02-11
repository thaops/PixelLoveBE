import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationSettingsDocument = NotificationSettings & Document;

@Schema({ timestamps: true })
export class NotificationSettings {
    @Prop({ required: true, unique: true })
    userId: string;

    @Prop({ default: true })
    interaction: boolean;

    @Prop({ default: true })
    streakWarning: boolean;

    @Prop({ default: true })
    milestones: boolean;

    @Prop({ default: true })
    partnerOpen: boolean;
}

export const NotificationSettingsSchema = SchemaFactory.createForClass(NotificationSettings);
