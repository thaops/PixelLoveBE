import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlayTrackDto {
    @ApiProperty({ description: 'ID của Track (Audio) muốn phát hợp lệ' })
    @IsNotEmpty()
    @IsString()
    trackId: string;

    @ApiPropertyOptional({ description: 'Thời điểm bắt đầu phát (giây). Dùng để resume bài hát.', example: 1.37 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    startTime?: number;
}
