import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class TimerDto {
    @ApiProperty({
        description: 'Số phút hẹn giờ tắt nhạc (5, 15, 30, 60). Gửi 0 để hủy hẹn giờ.',
        example: 30
    })
    @IsNumber()
    @Min(0)
    @Max(1440) // Tối đa 24h
    minutes: number;
}
