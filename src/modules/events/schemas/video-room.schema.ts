import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class VideoItem {
  @Prop({ default: () => Math.random().toString(36).substring(7) })
  id: string; // ID duy nhất cho mỗi item trong queue (không phải videoId)

  @Prop({ required: true })
  videoId: string;

  @Prop()
  title?: string;

  @Prop()
  thumbnail?: string;

  @Prop()
  duration?: number;

  @Prop()
  url?: string;
}

export type VideoRoomDocument = VideoRoom & Document;

@Schema({ timestamps: true })
export class VideoRoom {
  @Prop({ required: true, unique: true })
  roomId: string; // ID của couple room

  @Prop()
  hostId: string;

  @Prop({ default: 'video' })
  mode: string;

  @Prop()
  videoId: string;

  @Prop({ type: [VideoItem], default: [] })
  videoQueue: VideoItem[];

  @Prop({ default: 0 })
  currentIndex: number;

  @Prop({ default: 0 })
  currentTime: number;

  @Prop({ default: false })
  isPlaying: boolean;
}

export const VideoRoomSchema = SchemaFactory.createForClass(VideoRoom);
