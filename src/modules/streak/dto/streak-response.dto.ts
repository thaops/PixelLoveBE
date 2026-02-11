import { ApiProperty } from '@nestjs/swagger';

export class StreakResponseDto {
    @ApiProperty({ example: 5 })
    days: number;

    @ApiProperty({ example: 'strong', enum: ['strong', 'warning', 'broken'] })
    level: string;

    @ApiProperty({ example: 'B', nullable: true })
    missingSide: string | null;

    @ApiProperty({ example: 6 })
    hoursToBreak: number;
}
