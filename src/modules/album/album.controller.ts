import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AlbumService } from './album.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AddPhotoDto } from './dto/add-photo.dto';

@ApiTags('Album')
@Controller('album')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Post('add')
  @ApiOperation({ summary: 'Add photo to album (URL from Cloudinary)' })
  @ApiResponse({
    status: 201,
    description: 'Photo added successfully',
    schema: {
      type: 'object',
      properties: {
        photoId: { type: 'string', example: 'p_993' },
        createdDate: { type: 'string', example: '2025-12-06T10:30:00Z' },
      },
    },
  })
  async addPhoto(
    @CurrentUser() user: any,
    @Body() addPhotoDto: AddPhotoDto,
  ) {
    return this.albumService.addPhoto(user, addPhotoDto.imageUrl);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all photos in album' })
  @ApiResponse({
    status: 200,
    description: 'List of photos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          photoId: { type: 'string', example: 'p_993' },
          userId: { type: 'string', example: 'u_23871' },
          imageUrl: { type: 'string', example: 'https://...' },
          createdDate: { type: 'string', example: '2025-12-06T10:30:00Z' },
        },
      },
    },
  })
  async list(@CurrentUser() user: any) {
    return this.albumService.list(user);
  }
}

