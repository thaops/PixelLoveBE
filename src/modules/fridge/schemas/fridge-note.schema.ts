import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FridgeNoteDocument = FridgeNote & Document;

/**
 * FridgeNote Schema
 * Stores notes on the fridge (Home - Fridge feature)
 */
@Schema({ timestamps: true })
export class FridgeNote {
  @Prop({ required: true })
  coupleId: string; // Reference to couple room

  @Prop({ required: true })
  content: string; // Note content text

  @Prop({ required: true })
  frameImageUrl: string; // Random note frame image URL

  @Prop({ required: true, type: Number })
  positionX: number; // Float 0 → 1 (relative to screen width)

  @Prop({ required: true, type: Number })
  positionY: number; // Float 0 → 1 (relative to screen height)

  @Prop({ required: true, type: Number })
  rotation: number; // Rotation angle in degrees (e.g., -5 to +5)

  // Timestamps are automatically added by Mongoose when timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

export const FridgeNoteSchema = SchemaFactory.createForClass(FridgeNote);

// Index for faster lookups - get latest notes for a couple
FridgeNoteSchema.index({ coupleId: 1, createdAt: -1 });

