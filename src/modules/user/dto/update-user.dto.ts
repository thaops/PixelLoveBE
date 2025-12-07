import { IsString, IsOptional, IsEnum, IsDateString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Update User DTO
 * Allows updating user profile information
 */
export class UpdateUserDto {
  @ApiProperty({
    description: 'User display name',
    example: 'Thao',
    required: false,
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({
    description: 'User gender',
    enum: ['male', 'female', 'other'],
    example: 'male',
    required: false,
  })
  @IsEnum(['male', 'female', 'other'])
  @IsOptional()
  gender?: 'male' | 'female' | 'other';

  @ApiProperty({
    description: 'User birth date (ISO format)',
    example: '1999-02-14',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://res.cloudinary.com/xxx/avatar.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}

