import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTrackDto {
    @ApiProperty({
        description: 'Đường dẫn video YouTube',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })
    @IsNotEmpty()
    @IsString()
    @IsUrl()
    youtubeUrl: string;

    @ApiProperty({ required: false })
    @IsString()
    title?: string;

    @ApiProperty({ required: false })
    @IsString()
    thumbnail?: string;

    @ApiProperty({ required: false })
    @IsString()
    audioUrl?: string;

    @ApiProperty({ required: false })
    duration?: number;
}
