import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoomDocument = Room & Document;

/**
 * Room Schema
 * Represents a user's virtual home room (solo or couple)
 */
@Schema({ timestamps: true })
export class Room {
  @Prop({ type: String, default: null })
  backgroundId: string | null; // Reference to Background.id

  @Prop({ type: [Object], default: null })
  objects: any[] | null; // Room objects/furniture
}

export const RoomSchema = SchemaFactory.createForClass(Room);

