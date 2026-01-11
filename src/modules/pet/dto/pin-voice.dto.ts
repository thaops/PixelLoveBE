import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PinVoiceDto {
    @ApiProperty({
        description: 'Voice ID to pin',
        example: '507f1f77bcf86cd799439011',
    })
    @IsNotEmpty()
    @IsString()
    voiceId: string;
}
