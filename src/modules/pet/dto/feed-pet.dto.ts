import { IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FeedPetDto {
  @ApiProperty({
    description: 'Photo URL (optional)',
    example: 'https://res.cloudinary.com/xxx/image.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  photoUrl?: string;
}
