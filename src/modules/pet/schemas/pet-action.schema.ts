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

  @Prop({ required: true, enum: ['petting', 'image'] })
  type: 'petting' | 'image';

  @Prop({ required: false })
  imageUrl?: string; // Only for type='image'

  // 👇 Thời điểm dùng cho logic (EXP, cooldown, bonus) - default = createdAt
  @Prop({ default: () => new Date(), required: true })
  actionAt: Date;

  // 👇 Thời điểm chụp ảnh (optional, chỉ để UI hiển thị timeline)
  @Prop({ required: false })
  takenAt?: Date;

  // 👇 EXP đã tính (để audit và hiển thị)
  @Prop({ default: 0 })
  baseExp: number;

  @Prop({ default: 0 })
  bonusExp: number;

  // 👇 Text mô tả (optional, cho tương lai)
  @Prop({ required: false })
  text?: string;

  // 👇 Mood (optional) - dùng để FE render chip cảm xúc
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

