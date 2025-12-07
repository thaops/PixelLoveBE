import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetLoveDateDto {
  @ApiProperty({
    description: 'Love start date (ISO format: YYYY-MM-DD)',
    example: '2024-02-14',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  date: string;
}

