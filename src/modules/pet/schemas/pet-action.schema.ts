import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
}

export const PetActionSchema = SchemaFactory.createForClass(PetAction);

// Indexes for fast queries
PetActionSchema.index({ coupleId: 1, createdAt: -1 });
PetActionSchema.index({ coupleId: 1, type: 1, createdAt: -1 });
PetActionSchema.index({ coupleId: 1, userId: 1, createdAt: -1 });

