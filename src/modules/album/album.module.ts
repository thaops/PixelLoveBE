import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AlbumController } from './album.controller';
import { CloudinaryController } from './cloudinary.controller';
import { AlbumService } from './album.service';
import { CloudinaryService } from './cloudinary.service';
import { Album, AlbumSchema } from './schemas/album.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Album.name, schema: AlbumSchema }]),
    ConfigModule,
  ],
  controllers: [AlbumController, CloudinaryController],
  providers: [AlbumService, CloudinaryService],
  exports: [CloudinaryService, AlbumService],
})
export class AlbumModule {}

