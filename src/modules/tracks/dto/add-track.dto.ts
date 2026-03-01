import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTrackDto {
    @ApiProperty({
        description: 'Đường dẫn video YouTube để lấy âm thanh',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    youtubeUrl: string;
}
