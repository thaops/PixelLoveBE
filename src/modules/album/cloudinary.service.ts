import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload file to Cloudinary
   * @param file - Multer file object
   * @param folder - Optional folder path in Cloudinary
   * @returns Upload result with secure_url
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'pixellove',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: 'auto' as const, // auto-detect image/video
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'],
      };

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(new BadRequestException(`Upload failed: ${error.message}`));
          } else if (result) {
            resolve(result);
          } else {
            reject(new BadRequestException('Upload failed: No result'));
          }
        })
        .end(file.buffer);
    });
  }

  /**
   * Delete file from Cloudinary
   * @param publicId - Public ID of the file
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }
}

