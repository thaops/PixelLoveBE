import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Background, BackgroundDocument } from './schemas/background.schema';

/**
 * Background Service
 * Manages background master data and default backgrounds
 */
@Injectable()
export class BackgroundService {
  // Default background constant
  private readonly DEFAULT_BACKGROUND = {
    imageUrl: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1769094132/background_ch%C3%ADnh_t55903.png',
    width: 4096,
    height: 1920,
  };

  constructor(
    @InjectModel(Background.name)
    private backgroundModel: Model<BackgroundDocument>,
  ) { }

  /**
   * Get background by ID
   */
  async getBackgroundById(backgroundId: string): Promise<BackgroundDocument | null> {
    return this.backgroundModel.findById(backgroundId).exec();
  }

  /**
   * Get room background
   * Returns background from room.backgroundId or default if null
   */
  async getRoomBackground(room: { backgroundId: string | null } | null) {
    if (!room || !room.backgroundId) {
      return this.DEFAULT_BACKGROUND;
    }

    const background = await this.getBackgroundById(room.backgroundId);
    if (!background) {
      return this.DEFAULT_BACKGROUND;
    }

    return {
      imageUrl: background.imageUrl,
      width: background.width,
      height: background.height,
    };
  }

  /**
   * Get default background
   */
  getDefaultBackground() {
    return this.DEFAULT_BACKGROUND;
  }
}

