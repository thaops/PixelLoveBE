import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BackgroundDocument = Background & Document;

/**
 * Background Schema (Master Data)
 * Stores available background skins for rooms
 */
@Schema({ timestamps: true })
export class Background {
  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  width: number;

  @Prop({ required: true })
  height: number;
}

export const BackgroundSchema = SchemaFactory.createForClass(Background);

