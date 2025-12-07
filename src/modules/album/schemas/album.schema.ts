import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlbumDocument = Album & Document;

@Schema({ timestamps: true })
export class Album {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: false })
  coupleId?: string;

  @Prop({ required: true })
  imageUrl: string;
}

export const AlbumSchema = SchemaFactory.createForClass(Album);

