import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Album, AlbumDocument } from './schemas/album.schema';
import { StreakService } from '../streak/streak.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AlbumService {
  constructor(
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
    private streakService: StreakService,
    private notificationService: NotificationService,
  ) { }

  async addPhoto(user: any, imageUrl: string) {
    if (!imageUrl.startsWith('http')) {
      throw new BadRequestException('Invalid image url');
    }

    const photo = await this.albumModel.create({
      userId: user._id,
      coupleId: user.coupleRoomId || null,
      imageUrl,
    });

    if (user.coupleRoomId) {
      await this.streakService.recordInteraction(user._id.toString(), user.coupleRoomId);
      await this.notificationService.sendInteractionPush(user._id.toString());
    }

    return {
      photoId: photo._id,
      createdDate: (photo as any).createdAt || new Date(),
    };
  }

  async list(user: any) {
    const filter: any = {};
    if (user.coupleRoomId) {
      filter.coupleId = user.coupleRoomId;
    } else {
      filter.userId = user._id;
    }

    const photos = await this.albumModel
      .find(filter)
      .sort({ createdAt: -1 });

    return photos.map((p) => ({
      photoId: p._id,
      userId: p.userId,
      imageUrl: p.imageUrl,
      createdDate: (p as any).createdAt || new Date(),
    }));
  }
}

