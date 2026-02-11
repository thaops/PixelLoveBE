import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

/**
 * User Schema
 * Stores user information from OAuth providers
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, enum: ['google', 'facebook'] })
  provider: string;

  @Prop({ required: true })
  providerId: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  displayName: string; // Từ Google (backup)

  @Prop()
  nickname: string; // Do user đặt (dùng trong app)

  @Prop()
  avatarUrl: string;

  @Prop()
  birthDate: Date; // Date of birth

  @Prop()
  gender: string;

  @Prop()
  zodiac: string; // Auto-calculate từ birthDate

  @Prop({ default: false })
  isOnboarded: boolean; // Flag để check user đã hoàn tất onboarding chưa

  @Prop({ default: 'solo', enum: ['solo', 'couple'] })
  mode: string;

  @Prop({ default: null })
  coupleCode: string; // Unique code for couple matching

  @Prop({ default: null })
  coupleCodeExpiresAt: Date; // Code expiration time (48 hours)

  @Prop({ default: null })
  partnerId: string; // Partner's user ID

  @Prop({ default: null })
  coupleRoomId: string;

  @Prop({ default: null })
  roomId: string; // Reference to Room.id (solo or couple room)

  @Prop({ default: 0 })
  coins: number;

  @Prop({ default: null })
  onesignalPlayerId: string;

  @Prop({ default: null })
  lastActiveAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create compound unique index for provider + providerId
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true });

