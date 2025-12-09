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

export class BackgroundDto {
  @ApiProperty({
    description: 'Background image URL',
    example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1765297673/Rectangle_12841_1_z50uay.png',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Background width in pixels',
    example: 1242,
  })
  width: number;

  @ApiProperty({
    description: 'Background height in pixels',
    example: 2688,
  })
  height: number;
}

export class ObjectDto {
  @ApiProperty({
    description: 'Object ID',
    example: 'pet',
  })
  id: string;

  @ApiProperty({
    description: 'Object type',
    example: 'pet',
  })
  type: string;

  @ApiProperty({
    description: 'Object image URL',
    example: 'https://res.cloudinary.com/dukoun1pb/image/upload/v1765289116/Gemini_Generated_Image_73r7az73r7az73r7-removebg-preview_cfh0qt.png',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'X position in pixels',
    example: 371,
  })
  x: number;

  @ApiProperty({
    description: 'Y position in pixels',
    example: 1094,
  })
  y: number;

  @ApiProperty({
    description: 'Object width in pixels',
    example: 500,
  })
  width: number;

  @ApiProperty({
    description: 'Object height in pixels',
    example: 500,
  })
  height: number;

  @ApiProperty({
    description: 'Z-index for layering',
    example: 10,
  })
  zIndex: number;
}

export class PetStatusSceneDto {
  @ApiProperty({
    description: 'Current pet level',
    example: 3,
  })
  level: number;

  @ApiProperty({
    description: 'Current experience points',
    example: 270,
  })
  exp: number;

  @ApiProperty({
    description: 'Experience needed to reach next level',
    example: 500,
  })
  expToNextLevel: number;

  @ApiProperty({
    description: 'Number of feeds (image actions) today',
    example: 6,
  })
  todayFeedCount: number;

  @ApiProperty({
    description: 'Last feed time (ISO string)',
    example: '2025-12-06T10:30:00.000Z',
    nullable: true,
  })
  lastFeedTime: string | null;
}

export class PetSceneResponseDto {
  @ApiProperty({
    description: 'Background information',
    type: BackgroundDto,
  })
  background: BackgroundDto;

  @ApiProperty({
    description: 'Objects in the scene',
    type: [ObjectDto],
  })
  objects: ObjectDto[];

  @ApiProperty({
    description: 'Pet status information',
    type: PetStatusSceneDto,
  })
  petStatus: PetStatusSceneDto;
}

