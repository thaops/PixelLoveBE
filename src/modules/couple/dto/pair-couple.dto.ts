import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PairCoupleDto {
  @ApiProperty({
    description: 'Couple code to pair with',
    example: 'XY3H56',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

