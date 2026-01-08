import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PET_IMAGE_MOODS, PetImageMood } from '../pet.constants';

export type PetActionDocument = PetAction & Document;

/**
 * Pet Action Schema
 * Logs all petting and image actions for history and bonus calculation
 */
@Schema({ timestamps: true })
export class PetAction {
  @Prop({ required: true })
  coupleId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['petting', 'image', 'voice'] })
  type: 'petting' | 'image' | 'voice';

  @Prop({ required: false })
  imageUrl?: string; // Only for type='image'

  @Prop({ required: false })
  audioUrl?: string; // Only for type='voice'

  @Prop({ required: false })
  duration?: number; // Duration in seconds for type='voice'

  @Prop({ default: () => new Date(), required: true })
  actionAt: Date;

  @Prop({ required: false })
  takenAt?: Date;

  @Prop({ default: 0 })
  baseExp: number;

  @Prop({ default: 0 })
  bonusExp: number;

  @Prop({ required: false })
  text?: string;

  @Prop({ type: String, required: false, enum: PET_IMAGE_MOODS })
  mood?: PetImageMood | null;
}

export const PetActionSchema = SchemaFactory.createForClass(PetAction);

// Indexes for fast queries
PetActionSchema.index({ coupleId: 1, createdAt: -1 });
PetActionSchema.index({ coupleId: 1, type: 1, createdAt: -1 });
PetActionSchema.index({ coupleId: 1, userId: 1, createdAt: -1 });
// 👇 Index cho cooldown check và bonus check (quan trọng nhất)
PetActionSchema.index({ coupleId: 1, userId: 1, type: 1, actionAt: -1 });
PetActionSchema.index({ coupleId: 1, type: 1, actionAt: -1 });

