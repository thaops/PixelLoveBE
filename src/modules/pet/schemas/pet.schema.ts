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
}

export const PetSchema = SchemaFactory.createForClass(Pet);

// Index for faster lookups
PetSchema.index({ coupleId: 1 });

