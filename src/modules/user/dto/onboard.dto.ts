import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Onboard DTO
 * Required fields để hoàn tất onboarding
 */
export class OnboardDto {
  @ApiProperty({
    description: 'User nickname (do user đặt)',
    example: 'Thao',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({
    description: 'User gender',
    enum: ['male', 'female', 'other'],
    example: 'male',
    required: true,
  })
  @IsEnum(['male', 'female', 'other'])
  @IsNotEmpty()
  gender: 'male' | 'female' | 'other';

  @ApiProperty({
    description: 'User birth date (ISO format)',
    example: '1999-02-14',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;
}

