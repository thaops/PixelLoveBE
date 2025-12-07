import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomService } from './room.service';
import { Room, RoomSchema } from './schemas/room.schema';

/**
 * Room Module
 * Manages user virtual home rooms
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Room.name, schema: RoomSchema }]),
  ],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}

