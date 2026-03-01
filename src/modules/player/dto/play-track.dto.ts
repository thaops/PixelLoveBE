import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlayTrackDto {
    @ApiProperty({ description: 'ID của Track (Audio) muốn phát hợp lệ' })
    @IsNotEmpty()
    @IsString()
    trackId: string;
}
