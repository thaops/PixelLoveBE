import {
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PET_IMAGE_MOODS, PetImageMood } from '../pet.constants';

export class SendImageDto {
  @ApiProperty({
    description: 'Image URL from Cloudinary',
    example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg',
    required: true,
  })
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    description: 'Timestamp when photo was taken (optional, for timeline display)',
    example: '2025-12-14T14:20:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @ApiProperty({
    description: 'Optional text/caption for the image',
    example: 'Cute moment together!',
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    description: 'Optional mood for the image',
    example: 'eat',
    required: false,
    enum: PET_IMAGE_MOODS,
  })
  @IsOptional()
  @IsString()
  mood?: PetImageMood | string;
}

