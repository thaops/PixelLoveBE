import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDeviceDocument = UserDevice & Document;

@Schema({ timestamps: true })
export class UserDevice {
    @Prop({ required: true, index: true })
    userId: string;

    @Prop({ required: true, index: true })
    deviceId: string; // Hardware UUID/ID from app

    @Prop({ required: true, enum: ['ios', 'android', 'web'] })
    platform: string;

    @Prop({ required: true, index: true })
    onesignalPlayerId: string;

    @Prop()
    appVersion: string;

    @Prop({ default: Date.now })
    lastActiveAt: Date;

    @Prop({ default: true })
    isActive: boolean;
}

export const UserDeviceSchema = SchemaFactory.createForClass(UserDevice);

UserDeviceSchema.index({ userId: 1, isActive: 1 });
UserDeviceSchema.index({ deviceId: 1 }, { unique: true });
