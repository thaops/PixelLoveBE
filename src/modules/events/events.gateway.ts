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
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';

/**
 * Events Gateway
 * Handles WebSocket connections for real-time events
 * Namespace: /events
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
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  /**
   * Handle client connection
   * Validates JWT token from handshake auth
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-secret',
      });

      // Get user from database
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        this.logger.warn(`Connection rejected: User not found`);
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.userId = user._id.toString();
      client.data.user = user;

      // Track connected user
      this.connectedUsers.set(client.id, user._id.toString());

      this.logger.log(`User connected: ${user._id} (socket: ${client.id})`);

      // Join user's personal room
      await client.join(`user:${user._id.toString()}`);

      // If user is in a couple room, join that room too
      if (user.coupleRoomId) {
        const coupleRoom = `couple:${user.coupleRoomId.toString()}`;
        await client.join(coupleRoom);
        this.logger.log(`User ${user._id} joined couple room: ${coupleRoom}`);
      }

      // If user has a roomId (which might be the same or different), join it as well
      if (user.roomId && user.roomId !== user.coupleRoomId) {
        await client.join(`couple:${user.roomId}`);
        this.logger.log(`User ${user._id} joined additional room: ${user.roomId}`);
      }

      // Emit connection success
      client.emit('connected', {
        userId: user._id,
        coupleRoomId: user.coupleRoomId,
        rooms: Array.from(client.rooms),
      });

      this.logger.log(`Socket Debug: User ${user._id} is now in rooms: ${JSON.stringify(Array.from(client.rooms))}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.logger.log(`User disconnected: ${userId} (socket: ${client.id})`);

      // If user was in a player room, notify partner before deleting
      const user = client.data.user;
      if (user) {
        const roomId = user.coupleRoomId || user.roomId;
        if (roomId) {
          this.server.to(`couple:${roomId}`).emit('player:partner-presence', {
            userId,
            status: 'offline'
          });
        }
      }

      this.connectedUsers.delete(client.id);
    }
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try to get token from auth object (handshake.auth.token)
    const tokenFromAuth = client.handshake.auth?.token;
    if (tokenFromAuth) {
      // Remove 'Bearer ' prefix if present
      return tokenFromAuth.replace(/^Bearer\s+/, '');
    }

    // Try to get token from query string (handshake.query.token)
    const tokenFromQuery = client.handshake.query?.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Try to get token from Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Join couple room
   * Client can explicitly join a couple room
   */
  @SubscribeMessage('joinCoupleRoom')
  async handleJoinCoupleRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { coupleRoomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const user = await this.userModel.findById(userId);
    if (!user || user.coupleRoomId !== data.coupleRoomId) {
      client.emit('error', { message: 'Access denied to this couple room' });
      return;
    }

    await client.join(`couple:${data.coupleRoomId}`);
    client.emit('joinedCoupleRoom', { coupleRoomId: data.coupleRoomId });
    this.logger.log(`User ${userId} joined couple room: ${data.coupleRoomId}`);
  }

  /**
   * Leave couple room
   */
  @SubscribeMessage('leaveCoupleRoom')
  async handleLeaveCoupleRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { coupleRoomId: string },
  ) {
    await client.leave(`couple:${data.coupleRoomId}`);
    client.emit('leftCoupleRoom', { coupleRoomId: data.coupleRoomId });
  }

  /**
   * User enters player screen
   */
  @SubscribeMessage('player:enter')
  async handlePlayerEnter(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const user = client.data.user;
    if (!user) return;

    const roomId = user.coupleRoomId || user.roomId;
    if (!roomId) return;

    const playerRoom = `player-active:${roomId}`;
    const coupleRoom = `couple:${roomId}`;

    // Join the player active room
    await client.join(playerRoom);

    // Notify partner that I am here
    client.to(coupleRoom).emit('player:partner-presence', {
      userId,
      status: 'online',
      avatar: user.avatar,
      nickname: user.nickname || user.displayName
    });

    // Check if partner is already in the player room
    const sockets = await this.server.in(playerRoom).fetchSockets();
    const partnerSocket = sockets.find(s => s.data.userId !== userId);

    if (partnerSocket) {
      const partnerUser = partnerSocket.data.user;
      // Tell current user that partner is already here
      client.emit('player:partner-presence', {
        userId: partnerSocket.data.userId,
        status: 'online',
        avatar: partnerUser?.avatar,
        nickname: partnerUser?.nickname || partnerUser?.displayName
      });
    }

    this.logger.log(`User ${userId} entered player screen in room ${roomId}`);
  }

  /**
   * User leaves player screen
   */
  @SubscribeMessage('player:leave')
  async handlePlayerLeave(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const user = client.data.user;
    if (!user) return;

    const roomId = user.coupleRoomId || user.roomId;
    if (!roomId) return;

    const playerRoom = `player-active:${roomId}`;
    const coupleRoom = `couple:${roomId}`;

    await client.leave(playerRoom);

    // Notify partner that I left
    client.to(coupleRoom).emit('player:partner-presence', {
      userId,
      status: 'offline'
    });

    this.logger.log(`User ${userId} left player screen in room ${roomId}`);
  }

  /**
   * Emit event to all users in a couple room
   */
  async emitToCoupleRoom(coupleRoomId: string, event: string, data: any) {
    const roomName = `couple:${coupleRoomId.toString()}`;
    const clients = await this.server.in(roomName).fetchSockets();
    this.server.to(roomName).emit(event, data);
    this.logger.log(
      `Emitted ${event} to room ${roomName}. Connected clients in room: ${clients.length}`,
    );
  }

  /**
   * Emit event to a specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.log(`Emitted ${event} to user: ${userId}`);
  }

  /**
   * Emit event to multiple users
   */
  emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => {
      this.emitToUser(userId, event, data);
    });
  }
}

