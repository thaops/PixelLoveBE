import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VideoRoom, VideoRoomDocument, VideoItem } from './schemas/video-room.schema';
import * as ytdl from '@distube/ytdl-core';

export interface VideoPlayerState {
  mode: 'video';
  videoId: string;
  currentId?: string;
  videoQueue: VideoItem[];
  currentIndex: number;
  currentTime: number;
  isPlaying: boolean;
  hostId: string;
  lastActivity: Date;
  isDirty?: boolean;
}

@Injectable()
export class VideoPlayerService {
  private readonly logger = new Logger(VideoPlayerService.name);
  private videoRooms = new Map<string, VideoPlayerState>();

  constructor(
    @InjectModel(VideoRoom.name) private videoRoomModel: Model<VideoRoomDocument>,
  ) { }

  // ─── Extraction Logic (Production Ready) ────────────────────────────────

  /**
   * Trích xuất VideoId từ mọi định dạng link YouTube (watch, youtu.be, shorts, raw...)
   */
  public extractVideoId(input: string): string | null {
    if (!input) return null;

    // Case 1: Raw videoId (11 ký tự chuẩn YouTube)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
        return input;
    }

    // Case 2: Link URL (ytdl handle most cases: watch, youtu.be, embed, shorts, etc.)
    try {
        return ytdl.getURLVideoID(input);
    } catch {
        return null;
    }
  }

  /**
   * Lấy metadata của video
   */
  async getVideoMetadata(videoId: string): Promise<Partial<VideoItem>> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getBasicInfo(url);
      const details = info.videoDetails;

      return {
        videoId,
        title: details.title,
        thumbnail: details.thumbnails?.[0]?.url,
        duration: Number(details.lengthSeconds),
        url: url,
      };
    } catch (e) {
      this.logger.error(`Fetch metadata error for ${videoId}: ${e.message}`);
      return { videoId }; // Fallback nếu không fetch được info
    }
  }

  // ─── Business Logic ──────────────────────────────────────────────────────

  async getOrRestoreState(roomId: string): Promise<VideoPlayerState | null> {
    let state = this.videoRooms.get(roomId);
    if (!state) {
      const dbRoom = await this.videoRoomModel.findOne({ roomId }).lean();
      if (dbRoom) {
        const currentItem = dbRoom.videoQueue[dbRoom.currentIndex];
        state = {
          mode: 'video',
          videoId: dbRoom.videoId || (currentItem?.videoId || ''),
          currentId: currentItem?.id || '',
          videoQueue: (dbRoom.videoQueue || []) as VideoItem[],
          currentIndex: dbRoom.currentIndex || 0,
          currentTime: dbRoom.currentTime || 0,
          isPlaying: dbRoom.isPlaying || false,
          hostId: dbRoom.hostId || '',
          lastActivity: new Date(),
        };
        this.videoRooms.set(roomId, state);
      }
    }
    return state || null;
  }

  async initState(roomId: string, userId: string, url: string, resetQueue: boolean = true) {
    const videoId = this.extractVideoId(url);
    if (!videoId) throw new BadRequestException('Invalid YouTube URL or videoId');

    const metadata = await this.getVideoMetadata(videoId);
    const newItem: VideoItem = { 
        id: this.generateId(), 
        ...metadata,
        videoId 
    };

    let videoQueue: VideoItem[] = [newItem];
    
    const existing = await this.getOrRestoreState(roomId);
    if (existing && resetQueue === false) {
      videoQueue = existing.videoQueue;
      const alreadyInQueue = videoQueue.findIndex(v => v.videoId === videoId);
      if (alreadyInQueue === -1) videoQueue.push(newItem);
    }

    const currentIdx = videoQueue.findIndex(v => v.videoId === videoId);
    const state: VideoPlayerState = {
      mode: 'video',
      videoId: videoId,
      currentId: videoQueue[currentIdx]?.id || newItem.id,
      videoQueue,
      currentIndex: currentIdx === -1 ? 0 : currentIdx,
      currentTime: 0,
      isPlaying: false,
      hostId: userId,
      lastActivity: new Date(),
    };

    this.videoRooms.set(roomId, state);
    await this.videoRoomModel.findOneAndUpdate({ roomId }, { ...state }, { upsert: true });
    return state;
  }

  async addVideo(roomId: string, url: string, userId?: string) {
    let state = await this.getOrRestoreState(roomId);
    
    // Nếu phòng chưa được khởi tạo (lần đầu thêm bài), tự động gọi initState
    if (!state) {
      this.logger.log(`Auto-initializing room ${roomId} with first video: ${url}`);
      return this.initState(roomId, userId || 'system', url, true);
    }

    const videoId = this.extractVideoId(url);
    if (!videoId) throw new BadRequestException('Invalid YouTube URL or videoId');

    // Chống duplicate trong cùng 1 queue nếu muốn (optional)
    const isDup = state.videoQueue.some(v => v.videoId === videoId);
    if (isDup) {
        this.logger.log(`Video ${videoId} already in queue for room ${roomId}`);
        return state; 
    }

    const metadata = await this.getVideoMetadata(videoId);
    const videoItem: VideoItem = { id: this.generateId(), ...metadata, videoId };
    
    state.videoQueue.push(videoItem);
    state.lastActivity = new Date();

    await this.videoRoomModel.updateOne({ roomId }, { $push: { videoQueue: videoItem } });
    return state;
  }

  async removeVideo(roomId: string, itemId: string) {
    const state = await this.getOrRestoreState(roomId);
    if (!state) throw new BadRequestException('Room not initialized');

    const index = state.videoQueue.findIndex(v => v.id === itemId);
    if (index === -1) throw new BadRequestException('Item not found');

    const isRemovingCurrent = state.currentIndex === index;
    state.videoQueue.splice(index, 1);

    if (state.currentIndex > index) {
      state.currentIndex--;
    } else if (isRemovingCurrent) {
      state.currentIndex = Math.min(state.currentIndex, state.videoQueue.length - 1);
      if (state.videoQueue.length > 0) {
        state.videoId = state.videoQueue[state.currentIndex].videoId;
        state.currentId = state.videoQueue[state.currentIndex].id;
        state.currentTime = 0;
        state.isPlaying = true;
      }
    }

    if (state.videoQueue.length === 0) {
      state.currentIndex = 0;
      state.videoId = '';
      state.currentId = '';
      state.isPlaying = false;
    }

    state.lastActivity = new Date();
    await this.videoRoomModel.updateOne({ roomId }, { 
      videoQueue: state.videoQueue, 
      currentIndex: state.currentIndex, 
      videoId: state.videoId,
      isPlaying: state.isPlaying,
      currentTime: state.currentTime
    });

    return { state, isRemovingCurrent };
  }

  async updatePlayback(roomId: string, type: 'play' | 'pause' | 'seek', time: number) {
    const state = await this.getOrRestoreState(roomId);
    if (!state) return null;

    if (type === 'play') {
      state.isPlaying = true;
      state.currentTime = time;
    } else if (type === 'pause') {
      state.isPlaying = false;
      state.currentTime = time;
    } else if (type === 'seek') {
      state.currentTime = time;
    }

    state.lastActivity = new Date();
    state.isDirty = true;
    return state;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  public getSyncedState(state: VideoPlayerState) {
    return {
      ...state,
      currentTime: this.getSyncedCurrentTime(state),
      serverTime: Date.now(),
    };
  }

  private getSyncedCurrentTime(state: { currentTime: number; isPlaying: boolean; lastActivity: Date }): number {
    if (!state.isPlaying) return state.currentTime;
    const elapsed = (Date.now() - new Date(state.lastActivity).getTime()) / 1000;
    return state.currentTime + elapsed;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(7);
  }

  getAllActiveRooms() {
    return this.videoRooms;
  }

  removeFromRam(roomId: string) {
    this.videoRooms.delete(roomId);
  }
}
