import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';
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
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    thumbnail?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    audioUrl?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    duration?: number;
}
