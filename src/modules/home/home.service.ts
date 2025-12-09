import { Injectable } from '@nestjs/common';
import { PetService } from '../pet/pet.service';
import { RoomService } from '../room/room.service';
import { BackgroundService } from '../background/background.service';
import { ObjectService } from '../object/object.service';

/**
 * Home Service
 * Returns the virtual home scene (background + objects + pet status)
 */
@Injectable()
export class HomeService {
  constructor(
    private petService: PetService,
    private roomService: RoomService,
    private backgroundService: BackgroundService,
    private objectService: ObjectService,
  ) {}

  /**
   * Get home scene for current user
   * Flow: user.roomId -> room -> room.backgroundId -> background
   */
  async getHomeScene(user: any) {
    // Get pet status
    const petStatus = await this.petService.getPet(user);

    // Get room by user.roomId
    const room = await this.roomService.getRoom(user.roomId);

    // Get background (from room.backgroundId or default)
    const background = await this.backgroundService.getRoomBackground(room);

    // Get objects (from room.objects or default)
    const objects = this.objectService.getRoomObjects(room);

    // Return scene
    return {
      background,
      objects,
      petStatus,
    };
  }
}

