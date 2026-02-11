import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationLogDocument = NotificationLog & Document;

@Schema()
export class NotificationLog {
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    type: string;

    @Prop({ default: Date.now })
    sentAt: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

NotificationLogSchema.index({ userId: 1, type: 1, sentAt: -1 });
