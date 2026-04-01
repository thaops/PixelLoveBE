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
import { VideoRoom, VideoRoomDocument } from './schemas/video-room.schema';
import { VideoPlayerService } from './video-player.service';
import { Cron } from '@nestjs/schedule';

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: '*', credentials: true },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private connectedUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private videoPlayerService: VideoPlayerService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(VideoRoom.name) private videoRoomModel: Model<VideoRoomDocument>,
  ) { }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) return client.disconnect();
      const payload = await this.jwtService.verifyAsync(token, { secret: this.configService.get<string>('JWT_SECRET') });
      const user = await this.userModel.findById(payload.sub);
      if (!user) return client.disconnect();

      client.data.userId = user._id.toString();
      client.data.user = user;
      this.connectedUsers.set(client.id, user._id.toString());
      await client.join(`user:${user._id.toString()}`);

      if (user.coupleRoomId) {
        const roomId = user.coupleRoomId.toString();
        await client.join(`couple:${roomId}`);
        const state = await this.videoPlayerService.getOrRestoreState(roomId);
        if (state) client.emit('player:state', this.videoPlayerService.getSyncedState(state));
      }
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    return auth ? auth.replace(/^Bearer\s+/, '') : null;
  }

  // ─── Video Events (Delegated to Service) ────────────────────────────────

  @SubscribeMessage('player:init')
  async handleVideoInit(@ConnectedSocket() client: Socket, @MessageBody() data: { videoId: string; resetQueue?: boolean }) {
    const roomId = client.data.user?.coupleRoomId?.toString();
    if (!roomId) return;
    const state = await this.videoPlayerService.initState(roomId, client.data.userId, data.videoId, data.resetQueue);
    this.server.to(`couple:${roomId}`).emit('player:state', this.videoPlayerService.getSyncedState(state));
  }

  @SubscribeMessage('player:update')
  async handleVideoUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { type: 'play' | 'pause' | 'seek'; time: number }) {
    const roomId = client.data.user?.coupleRoomId?.toString();
    if (!roomId) return;
    const state = await this.videoPlayerService.updatePlayback(roomId, data.type, data.time);
    if (state) {
      client.to(`couple:${roomId}`).emit('player:update', { 
        ...data, 
        isPlaying: state.isPlaying, 
        videoId: state.videoId, 
        currentId: state.currentId, 
        serverTime: Date.now() 
      });
    }
  }

  @SubscribeMessage('player:add')
  async handleVideoAdd(@ConnectedSocket() client: Socket, @MessageBody() data: { url: string }) {
    const roomId = client.data.user?.coupleRoomId?.toString();
    if (!roomId) return;
    try {
      const state = await this.videoPlayerService.addVideo(roomId, data.url);
      this.server.to(`couple:${roomId}`).emit('player:queue-updated', { queue: state.videoQueue, currentIndex: state.currentIndex, currentId: state.currentId, currentVideoId: state.videoId });
    } catch (e) {
      client.emit('player:error', { message: e.message });
    }
  }

  @SubscribeMessage('player:remove')
  async handleVideoRemove(@ConnectedSocket() client: Socket, @MessageBody() data: { id: string }) {
    const roomId = client.data.user?.coupleRoomId?.toString();
    if (!roomId) return;
    try {
      const { state, isRemovingCurrent } = await this.videoPlayerService.removeVideo(roomId, data.id);
      if (isRemovingCurrent) {
        this.server.to(`couple:${roomId}`).emit('player:state', this.videoPlayerService.getSyncedState(state));
      } else {
        this.server.to(`couple:${roomId}`).emit('player:queue-updated', { queue: state.videoQueue, currentIndex: state.currentIndex, currentId: state.currentId, currentVideoId: state.videoId });
      }
    } catch (e) { this.logger.error(e.message); }
  }

  @SubscribeMessage('player:next')
  async handleVideoNext(@ConnectedSocket() client: Socket) {
    const roomId = client.data.user?.coupleRoomId?.toString();
    if (!roomId) return;
    const state = await this.videoPlayerService.getOrRestoreState(roomId);
    if (!state || state.videoQueue.length === 0) return;
    const nextIdx = (state.currentIndex + 1) % state.videoQueue.length;
    const nextState = await this.videoPlayerService.initState(roomId, client.data.userId, state.videoQueue[nextIdx].videoId, false);
    this.server.to(`couple:${roomId}`).emit('player:state', this.videoPlayerService.getSyncedState(nextState));
  }

  @SubscribeMessage('player:ended')
  handleVideoEnded(@ConnectedSocket() client: Socket) {
    return this.handleVideoNext(client);
  }

  @Cron('0 * * * * *')
  async handleVideoSync() {
    for (const [roomId, state] of this.videoPlayerService.getAllActiveRooms()) {
      if (state.isDirty) {
        const syncedTime = this.videoPlayerService.getSyncedState(state).currentTime;
        await this.videoRoomModel.updateOne({ roomId }, { videoId: state.videoId, currentTime: syncedTime, isPlaying: state.isPlaying, currentIndex: state.currentIndex, lastActivity: state.lastActivity });
        state.isDirty = false;
      }
    }
  }

  // Helpers duplicated for external use
  async emitToCoupleRoom(roomId: string, event: string, data: any) { this.server.to(`couple:${roomId}`).emit(event, data); }
  emitToUser(userId: string, event: string, data: any) { this.server.to(`user:${userId}`).emit(event, data); }
}
