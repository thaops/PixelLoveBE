import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';

/**
 * Room Service
 * Manages user rooms (virtual home spaces)
 */
@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name)
    private roomModel: Model<RoomDocument>,
  ) {}

  /**
   * Get or create room by ID
   */
  async getRoom(roomId: string): Promise<RoomDocument | null> {
    if (!roomId) {
      return null;
    }
    return this.roomModel.findById(roomId).exec();
  }

  /**
   * Create a new room
   */
  async createRoom(backgroundId?: string | null): Promise<RoomDocument> {
    return this.roomModel.create({
      backgroundId: backgroundId || null,
    });
  }

  /**
   * Update room background
   */
  async updateRoomBackground(roomId: string, backgroundId: string | null): Promise<RoomDocument | null> {
    return this.roomModel.findByIdAndUpdate(
      roomId,
      { backgroundId },
      { new: true },
    ).exec();
  }
}

