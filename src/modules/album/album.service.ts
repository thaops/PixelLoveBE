import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Album, AlbumDocument } from './schemas/album.schema';

@Injectable()
export class AlbumService {
  constructor(
    @InjectModel(Album.name) private albumModel: Model<AlbumDocument>,
  ) {}

  async addPhoto(user: any, imageUrl: string) {
    if (!imageUrl.startsWith('http')) {
      throw new BadRequestException('Invalid image url');
    }

    const photo = await this.albumModel.create({
      userId: user._id,
      coupleId: user.coupleRoomId || null,
      imageUrl,
    });

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

