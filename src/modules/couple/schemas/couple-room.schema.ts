import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CoupleRoomDocument = CoupleRoom & Document;

/**
 * RoomState - Nested object for couple room virtual home state
 */
export class RoomState {
  @Prop({ default: 'default' })
  background: string;

  @Prop({ type: [Object], default: [] })
  items: any[]; // Virtual items in the room

  @Prop({ type: [Object], default: [] })
  pets: any[]; // Pets in the room with their states

  @Prop({ type: [Object], default: [] })
  achievements: any[]; // Unlocked achievements
}

/**
 * CoupleRoom Schema
 * Represents a shared space for couples with roomState, pets, and memories
 */
@Schema({ timestamps: true })
export class CoupleRoom {
  @Prop({ required: true, unique: true })
  code: string; // 6-character unique code

  @Prop({ type: Date, required: true })
  startDate: Date; // Date when couple was formed

  @Prop({ type: [String], default: [] })
  partners: string[]; // Array of exactly 2 user IDs

  @Prop({ type: RoomState, default: () => ({}) })
  roomState: RoomState; // Virtual home state

  // Legacy fields - keeping for backwards compatibility
  @Prop({ default: 1 })
  petLevel: number;

  @Prop({ default: 0 })
  exp: number;

  @Prop({ default: 'cat' })
  petType: string;
}

export const CoupleRoomSchema = SchemaFactory.createForClass(CoupleRoom);

// Index for faster lookups
CoupleRoomSchema.index({ partners: 1 });

