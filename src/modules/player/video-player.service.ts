import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VideoRoom, VideoRoomDocument, VideoItem } from '../events/schemas/video-room.schema';

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
  ) {}

  // ─── Core Logic (Shared between Socket & REST) ───────────────────────────

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
          videoQueue: dbRoom.videoQueue || [],
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

  async initState(roomId: string, userId: string, videoId: string, resetQueue: boolean = true) {
    const newItem: VideoItem = { id: this.generateId(), videoId };
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

  async addVideo(roomId: string, url: string) {
    const state = await this.getOrRestoreState(roomId);
    if (!state) throw new Error('Room not initialized');

    const videoId = this.extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const videoItem: VideoItem = { id: this.generateId(), videoId };
    state.videoQueue.push(videoItem);
    state.lastActivity = new Date();

    await this.videoRoomModel.updateOne({ roomId }, { $push: { videoQueue: videoItem } });
    return state;
  }

  async removeVideo(roomId: string, itemId: string) {
    const state = await this.getOrRestoreState(roomId);
    if (!state) throw new Error('Room not initialized');

    const index = state.videoQueue.findIndex(v => v.id === itemId);
    if (index === -1) throw new Error('Item not found');

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

  private extractVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      return null;
    } catch { return null; }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(7);
  }

  // To be used by Cron in Gateway
  getAllActiveRooms() {
    return this.videoRooms;
  }

  removeFromRam(roomId: string) {
    this.videoRooms.delete(roomId);
  }
}
