import { Injectable } from '@nestjs/common';

/**
 * Object Service
 * Manages room objects/furniture master data and default objects
 */
@Injectable()
export class ObjectService {
  // Default objects constant
  private readonly DEFAULT_OBJECTS = [
    {
      id: 'pet',
      type: 'pet',
      imageUrl: `https://res.cloudinary.com/dukoun1pb/image/upload/v1765289116/Gemini_Generated_Image_73r7az73r7az73r7-removebg-preview_cfh0qt.png`,
      x: 850,
      y: 930,
      width: 500,
      height: 500,
      zIndex: 10,
    },
  ];

  /**
   * Get room objects
   * Returns objects from room.objects or default if null/empty
   */
  getRoomObjects(room: { objects?: any[] | null } | null): any[] {
    if (!room || !room.objects || room.objects.length === 0) {
      return this.DEFAULT_OBJECTS;
    }
    return room.objects;
  }

  /**
   * Get default objects
   */
  getDefaultObjects() {
    return this.DEFAULT_OBJECTS;
  }
}

