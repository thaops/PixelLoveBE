import { ApiProperty } from '@nestjs/swagger';

export class RecentImageDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-12-06T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User ID who uploaded the image',
    example: 'u_23871',
  })
  userId: string;
}

export class PetStatusResponseDto {
  @ApiProperty({
    description: 'Current pet level',
    example: 2,
  })
  level: number;

  @ApiProperty({
    description: 'Current experience points',
    example: 100,
  })
  exp: number;

  @ApiProperty({
    description: 'Experience needed to reach next level',
    example: 400,
  })
  nextLevelExp: number;

  @ApiProperty({
    description: 'Recent images (last 5)',
    type: [RecentImageDto],
  })
  recentImages: RecentImageDto[];
}

export class PettingResponseDto {
  @ApiProperty({
    description: 'Total EXP added (base + bonus)',
    example: 10,
  })
  expAdded: number;

  @ApiProperty({
    description: 'Bonus EXP (5 if both users petted today, 0 otherwise)',
    example: 5,
  })
  bonus: number;

  @ApiProperty({
    description: 'Whether pet leveled up',
    example: true,
  })
  levelUp: boolean;
}

export class SendImageResponseDto {
  @ApiProperty({
    description: 'Total EXP added (base + bonus)',
    example: 40,
  })
  expAdded: number;

  @ApiProperty({
    description: 'Bonus EXP (20 if both users sent image today, 0 otherwise)',
    example: 20,
  })
  bonus: number;

  @ApiProperty({
    description: 'Whether pet leveled up',
    example: false,
  })
  levelUp: boolean;
}

export class PetImageItemDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-12-06T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User ID who uploaded the image',
    example: 'u_23871',
  })
  userId: string;
}

export class PetImagesResponseDto {
  @ApiProperty({
    description: 'List of images',
    type: [PetImageItemDto],
  })
  items: PetImageItemDto[];

  @ApiProperty({
    description: 'Total number of images',
    example: 30,
  })
  total: number;
}

