import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendImageDto {
  @ApiProperty({
    description: 'Image URL from Cloudinary',
    example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg',
    required: true,
  })
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;
}

