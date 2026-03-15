import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddExistingTrackDto {
    @ApiProperty({
        description: 'ID của bài hát có sẵn trong hệ thống',
        example: '65e2abc...'
    })
    @IsNotEmpty()
    @IsString()
    trackId: string;
}
