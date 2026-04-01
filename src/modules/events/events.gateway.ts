import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';
import { VideoRoom, VideoRoomDocument, VideoItem } from './schemas/video-room.schema';
import { Cron } from '@nestjs/schedule';

interface VideoPlayerState {
  mode: 'video';
  videoId: string;
  videoQueue: VideoItem[];
  currentIndex: number;
  currentTime: number;
  isPlaying: boolean;
  hostId: string;
  lastActivity: Date;
  isDirty?: boolean;
}

/**
 * Events Gateway — Production Ready YouTube Watch Together
 */
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers = new Map<string, string>();

  // RAM Store (Runtime Source of Truth)
  private videoRooms = new Map<string, VideoPlayerState>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(VideoRoom.name) private videoRoomModel: Model<VideoRoomDocument>,
  ) { }

  // ─── Connection / Disconnection ──────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        client.disconnect();
        return;
      }

      client.data.userId = user._id.toString();
      client.data.user = user;
      this.connectedUsers.set(client.id, user._id.toString());

      await client.join(`user:${user._id.toString()}`);

      if (user.coupleRoomId) {
        const roomId = user.coupleRoomId.toString();
        await client.join(`couple:${roomId}`);

        // Restore from DB if RAM is empty (Server restart logic)
        let videoState = this.videoRooms.get(roomId);
        if (!videoState) {
          const dbRoom = await this.videoRoomModel.findOne({ roomId }).lean();
          if (dbRoom) {
            videoState = {
              mode: 'video',
              videoId: dbRoom.videoId || (dbRoom.videoQueue[dbRoom.currentIndex]?.videoId || ''),
              videoQueue: dbRoom.videoQueue || [],
              currentIndex: dbRoom.currentIndex || 0,
              currentTime: dbRoom.currentTime || 0,
              isPlaying: dbRoom.isPlaying || false,
              hostId: dbRoom.hostId || '',
              lastActivity: new Date(),
            };
            this.videoRooms.set(roomId, videoState);
          }
        }

        if (videoState) {
          client.emit('player:state', {
            ...videoState,
            currentTime: this.getSyncedCurrentTime(videoState),
            serverTime: Date.now(), // Thêm serverTime để Mobile xử lý drift
          });
        }
      }

      client.emit('connected', { userId: user._id, coupleRoomId: user.coupleRoomId });
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      const user = client.data.user;
      if (user) {
        const roomId = user.coupleRoomId || user.roomId;
        if (roomId) {
          this.server.to(`couple:${roomId}`).emit('player:partner-presence', { userId, status: 'offline' });
          const state = this.videoRooms.get(roomId.toString());
          if (state && state.isDirty) this.syncRoomToDb(roomId.toString(), state);
        }
      }
      this.connectedUsers.delete(client.id);
    }
  }

  private extractToken(client: Socket): string | null {
    const tokenFromAuth = client.handshake.auth?.token;
    if (tokenFromAuth) return tokenFromAuth.replace(/^Bearer\s+/, '');
    const tokenFromQuery = client.handshake.query?.token as string;
    if (tokenFromQuery) return tokenFromQuery;
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
    return null;
  }

  // ─── Video Events (Production Ready) ─────────────────────────────────────

  /**
   * player:init — Khởi tạo chế độ video cho room
   * Payload: { mode: 'video', videoId: string, resetQueue?: boolean }
   */
  @SubscribeMessage('player:init')
  async handleVideoInit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mode: 'video'; videoId: string; resetQueue?: boolean },
  ) {
    const userId = client.data.userId;
    const user = client.data.user;
    if (!user || !userId) return;

    const roomId = (user.coupleRoomId || user.roomId)?.toString();
    if (!roomId) return;

    let videoQueue: VideoItem[] = [{ videoId: data.videoId }];
    
    // Fix 5: Nếu không resetQueue, giữ lại list cũ
    const existing = this.videoRooms.get(roomId);
    if (existing && data.resetQueue === false) {
      videoQueue = existing.videoQueue;
      const alreadyInQueue = videoQueue.findIndex(v => v.videoId === data.videoId);
      if (alreadyInQueue === -1) videoQueue.push({ videoId: data.videoId });
    }

    const state: VideoPlayerState = {
      mode: 'video',
      videoId: data.videoId,
      videoQueue,
      currentIndex: videoQueue.findIndex(v => v.videoId === data.videoId) || 0,
      currentTime: 0,
      isPlaying: false,
      hostId: userId,
      lastActivity: new Date(),
    };

    if (state.currentIndex === -1) state.currentIndex = 0;

    this.videoRooms.set(roomId, state);
    
    await this.videoRoomModel.findOneAndUpdate(
      { roomId },
      { ...state, hostId: userId },
      { upsert: true, new: true }
    );

    this.server.to(`couple:${roomId}`).emit('player:state', {
      ...state,
      serverTime: Date.now()
    });
  }

  /**
   * player:update — Đồng bộ Playback
   */
  @SubscribeMessage('player:update')
  handleVideoUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { type: 'play' | 'pause' | 'seek'; time?: number },
  ) {
    const user = client.data.user;
    if (!user) return;

    const roomId = (user.coupleRoomId || user.roomId)?.toString();
    if (!roomId) return;

    const state = this.videoRooms.get(roomId);
    if (!state) return;

    const time = data.time ?? state.currentTime;

    if (data.type === 'play') {
      state.isPlaying = true;
      state.currentTime = time;
    } else if (data.type === 'pause') {
      state.isPlaying = false;
      state.currentTime = time;
      this.syncRoomToDb(roomId, state);
    } else if (data.type === 'seek') {
      state.currentTime = time;
    }

    state.lastActivity = new Date();
    state.isDirty = true;

    // Fix 2: Trả full dữ liệu videoId và serverTime cho đối phương
    client.to(`couple:${roomId}`).emit('player:update', {
      type: data.type,
      currentTime: time,
      isPlaying: state.isPlaying,
      videoId: state.videoId,
      serverTime: Date.now(), // Fix 4: DRIFT HANDLING
    });
  }

  /**
   * player:add — Thêm video qua URL
   */
  @SubscribeMessage('player:add')
  async handleVideoAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { url: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    const roomId = (user.coupleRoomId || user.roomId)?.toString();
    if (!roomId) return;

    const state = this.videoRooms.get(roomId);
    if (!state) return;

    const videoId = this.extractVideoId(data.url);
    if (!videoId) {
      // Fix 1: Trả lỗi cho mobile
      client.emit('player:error', { message: 'Invalid YouTube URL' });
      return;
    }

    const videoItem = { videoId };
    state.videoQueue.push(videoItem);
    state.lastActivity = new Date();

    await this.videoRoomModel.updateOne({ roomId }, { $push: { videoQueue: videoItem } });

    // Fix 3: Trả full object chuẩn hóa
    this.server.to(`couple:${roomId}`).emit('player:queue-updated', {
      queue: state.videoQueue,
      currentIndex: state.currentIndex,
      currentVideoId: state.videoId,
    });
  }

  /**
   * player:remove — Xóa video khỏi queue
   */
  @SubscribeMessage('player:remove')
  async handleVideoRemove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { index: number },
  ) {
    const user = client.data.user;
    if (!user) return;

    const roomId = (user.coupleRoomId || user.roomId)?.toString();
    if (!roomId) return;

    const state = this.videoRooms.get(roomId);
    if (!state) return;

    const index = data.index;
    if (index < 0 || index >= state.videoQueue.length) return;

    const isRemovingCurrent = state.currentIndex === index;
    state.videoQueue.splice(index, 1);

    if (state.currentIndex > index) {
      state.currentIndex--;
    } else if (isRemovingCurrent) {
      // Fix 6: Xử lý xóa đúng bài đang xem
      state.currentIndex = Math.min(state.currentIndex, state.videoQueue.length - 1);
      if (state.videoQueue.length > 0) {
        state.videoId = state.videoQueue[state.currentIndex].videoId;
        state.currentTime = 0;
        state.isPlaying = true; // Auto-play tiếp bài kế
      }
    }

    if (state.videoQueue.length === 0) {
      state.currentIndex = 0;
      state.videoId = '';
      state.isPlaying = false;
    }

    state.lastActivity = new Date();
    
    await this.videoRoomModel.updateOne(
      { roomId },
      { 
        videoQueue: state.videoQueue, 
        currentIndex: state.currentIndex, 
        videoId: state.videoId,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime
      }
    );

    // Nếu xóa bài đang xem, emit state mới để sync ngay
    if (isRemovingCurrent) {
      this.server.to(`couple:${roomId}`).emit('player:state', { ...state, serverTime: Date.now() });
    } else {
      this.server.to(`couple:${roomId}`).emit('player:queue-updated', {
        queue: state.videoQueue,
        currentIndex: state.currentIndex,
        currentVideoId: state.videoId,
      });
    }
  }

  @SubscribeMessage('player:next')
  async handleVideoNext(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;
    const roomId = (user.coupleRoomId || user.roomId)?.toString();
    if (!roomId) return;

    const state = this.videoRooms.get(roomId);
    if (!state || state.videoQueue.length === 0) return;

    state.currentIndex = (state.currentIndex + 1) % state.videoQueue.length;
    state.videoId = state.videoQueue[state.currentIndex].videoId;
    state.currentTime = 0;
    state.isPlaying = true;
    state.lastActivity = new Date();

    await this.videoRoomModel.updateOne({ roomId }, { currentIndex: state.currentIndex, videoId: state.videoId, currentTime: 0, isPlaying: true });
    this.server.to(`couple:${roomId}`).emit('player:state', { ...state, serverTime: Date.now() });
  }

  @SubscribeMessage('player:previous')
  async handleVideoPrevious(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;
    const roomId = (user.coupleRoomId || user.roomId)?.toString();
    if (!roomId) return;

    const state = this.videoRooms.get(roomId);
    if (!state || state.videoQueue.length === 0) return;

    state.currentIndex = (state.currentIndex - 1 + state.videoQueue.length) % state.videoQueue.length;
    state.videoId = state.videoQueue[state.currentIndex].videoId;
    state.currentTime = 0;
    state.isPlaying = true;
    state.lastActivity = new Date();

    await this.videoRoomModel.updateOne({ roomId }, { currentIndex: state.currentIndex, videoId: state.videoId, currentTime: 0, isPlaying: true });
    this.server.to(`couple:${roomId}`).emit('player:state', { ...state, serverTime: Date.now() });
  }

  /**
   * Fix 7: player:ended — Xử lý khi video kết thúc
   */
  @SubscribeMessage('player:ended')
  async handleVideoEnded(@ConnectedSocket() client: Socket) {
    this.logger.log(`Video ended in room of user ${client.data.userId}, moving to next...`);
    return this.handleVideoNext(client);
  }

  // ─── Sync & Persistence ──────────────────────────────────────────────────

  @Cron('0 * * * * *')
  async handleVideoSync() {
    for (const [roomId, state] of this.videoRooms) {
      if (state.isDirty) {
        await this.syncRoomToDb(roomId, state);
        state.isDirty = false;
      }
    }
  }

  private async syncRoomToDb(roomId: string, state: VideoPlayerState) {
    try {
      const syncedTime = this.getSyncedCurrentTime(state);
      await this.videoRoomModel.updateOne(
        { roomId },
        { 
          videoId: state.videoId,
          currentTime: syncedTime,
          isPlaying: state.isPlaying,
          currentIndex: state.currentIndex,
          lastActivity: state.lastActivity
        }
      );
    } catch (e) { this.logger.error(`Sync error: ${e.message}`); }
  }

  // ─── External Services Helpers ───────────────────────────────────────────

  async emitToCoupleRoom(coupleRoomId: string, event: string, data: any) {
    this.server.to(`couple:${coupleRoomId.toString()}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => this.emitToUser(userId, event, data));
  }

  @SubscribeMessage('player:enter')
  async handlePlayerEnter(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return;
    const roomId = user.coupleRoomId || user.roomId;
    if (!roomId) return;
    await client.join(`player-active:${roomId}`);
    client.to(`couple:${roomId}`).emit('player:partner-presence', { userId: client.data.userId, status: 'online', avatar: user.avatar, nickname: user.nickname || user.displayName });
  }

  @SubscribeMessage('player:leave')
  async handlePlayerLeave(@ConnectedSocket() client: Socket) {
    const roomId = client.data.user?.coupleRoomId || client.data.user?.roomId;
    if (!roomId) return;
    await client.leave(`player-active:${roomId}`);
    client.to(`couple:${roomId}`).emit('player:partner-presence', { userId: client.data.userId, status: 'offline' });
  }

  // ─── Utils ───────────────────────────────────────────────────────────────

  private extractVideoId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      return null;
    } catch { return null; }
  }

  private getSyncedCurrentTime(state: { currentTime: number; isPlaying: boolean; lastActivity: Date }): number {
    if (!state.isPlaying) return state.currentTime;
    const elapsed = (Date.now() - new Date(state.lastActivity).getTime()) / 1000;
    return state.currentTime + elapsed;
  }
}
