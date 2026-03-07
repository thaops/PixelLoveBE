import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckTrackDto {
    @ApiProperty({
        description: 'Đường dẫn video YouTube để kiểm tra',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    youtubeUrl: string;
}
