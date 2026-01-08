import {
  Controller,
  Get,
  Post,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as crypto from 'crypto';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

/**
 * Cloudinary Controller
 * Handles Cloudinary upload utilities and file uploads
 */
@ApiTags('Cloudinary')
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) { }

  /**
   * GET /cloudinary/signature
   * Get Cloudinary signature for direct client upload
   */
  @Get('signature')
  @ApiOperation({ summary: 'Get Cloudinary signature for direct upload' })
  @ApiResponse({
    status: 200,
    description: 'Signature generated successfully',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'number', example: 1733470000 },
        signature: { type: 'string', example: 'a1b2c3...' },
        cloudName: { type: 'string', example: 'dukoun1pb' },
        apiKey: { type: 'string', example: '812625771166232' },
        uploadPreset: { type: 'string', example: 'cloudinary_love' },
      },
    },
  })
  getSignature() {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!apiSecret || !apiKey || !cloudName || !uploadPreset) {
      throw new BadRequestException('Missing Cloudinary env config');
    }

    const signature = crypto
      .createHash('sha1')
      .update(`timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`)
      .digest('hex');

    return {
      timestamp,
      signature,
      cloudName,
      apiKey,
      uploadPreset,
    };
  }

  /**
   * POST /cloudinary/upload
   * Upload image or GIF directly to Cloudinary via backend
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload image or GIF to Cloudinary',
    description:
      'Upload image (jpg, png, gif, webp) or video (mp4, mov) to Cloudinary. Returns secure_url.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image or GIF file to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        public_id: { type: 'string', example: 'pixellove/abc123' },
        secure_url: {
          type: 'string',
          example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg',
        },
        url: { type: 'string' },
        width: { type: 'number', example: 1920 },
        height: { type: 'number', example: 1080 },
        format: { type: 'string', example: 'jpg' },
        resource_type: { type: 'string', example: 'image' },
        bytes: { type: 'number', example: 123456 },
        created_at: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'audio/m4a',
      'audio/aac',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/x-m4a',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: jpg, png, gif, webp, mp4, mov, m4a, mp3, wav',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    try {
      const result = await this.cloudinaryService.uploadFile(file);
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        created_at: result.created_at,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}

