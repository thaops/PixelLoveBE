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
      id: 'boy',
      type: 'boy',
      imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1769093371/nh%C3%A2n_v%E1%BA%ADt_nam_ho5t0v.png',
      x: 1500,
      y: 860,
      width: 780,
      height: 780,
      zIndex: 10,
    },
    {
      id: 'girl',
      type: 'girl',
      imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1769093376/nh%C3%A2n_v%E1%BA%ADt_n%E1%BB%AF_rfv3bf.png',
      x: 1850,
      y: 930,
      width: 700,
      height: 700,
      zIndex: 10,
    },
    {
      id: 'pet',
      type: 'pet',
      imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1765289116/Gemini_Generated_Image_73r7az73r7az73r7-removebg-preview_cfh0qt.png',
      x: 850,
      y: 930,
      width: 500,
      height: 500,
      zIndex: 10,
    },
    {
      id: 'radio',
      type: 'radio',
      imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1767853620/image-removebg-preview_9_nnrmzi.png',
      x: 1300,
      y: 1360,
      width: 300,
      height: 300,
      zIndex: 10,
    },
    {
      id: 'fridge',
      type: 'fridge',
      imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1767420371/874a8a25-e65a-45e8-a50d-85048bdf76b6_pa00lu.png',
      x: 2600,
      y: 410,
      width: 700,
      height: 1000,
      zIndex: 10,
    },
    {
      id: 'img-couple',
      type: 'img-couple',
      imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1767419512/t%E1%BA%A3i_xu%E1%BB%91ng_ofgtla.png',
      x: 1100,
      y: 100,
      width: 300,
      height: 300,
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

