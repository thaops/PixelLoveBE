import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PetDocument = Pet & Document;

/**
 * Pet Schema
 * Tracks core progression: level and experience
 */
@Schema({ timestamps: true })
export class Pet {
  @Prop({ required: true })
  coupleId: string; // reference to couple

  @Prop({ default: 1 })
  level: number;

  @Prop({ default: 0 })
  experience: number; // current exp towards next level

  @Prop({ type: Date, default: Date.now })
  lastUpdatedAt: Date;

  @Prop({ default: 0 })
  streak: number; // consecutive days with interaction

  @Prop({ type: Date })
  streakUpdatedAt: Date; // last time streak was updated (or checked)

  @Prop({ type: Object, default: {} })
  partnerActivity: Record<string, Date>; // userId -> lastActiveAt
}

export const PetSchema = SchemaFactory.createForClass(Pet);

// Index for faster lookups
PetSchema.index({ coupleId: 1 });

