import {
    IsNotEmpty,
    IsUrl,
    IsOptional,
    IsDateString,
    IsString,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PET_IMAGE_MOODS, PetImageMood } from '../pet.constants';

export class SendVoiceDto {
    @ApiProperty({
        description: 'Audio URL from Cloudinary',
        example: 'https://res.cloudinary.com/dukoun1pb/video/upload/v123/voice.m4a',
        required: true,
    })
    @IsUrl()
    @IsNotEmpty()
    audioUrl: string;

    @ApiProperty({
        description: 'Duration of audio in seconds (max 60s)',
        example: 12,
        required: true,
        minimum: 1,
        maximum: 60,
    })
    @IsNumber()
    @Min(1)
    @Max(60)
    @IsNotEmpty()
    duration: number;

    @ApiProperty({
        description: 'Timestamp when voice was recorded (optional)',
        example: '2025-12-14T14:20:00.000Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    takenAt?: string;

    @ApiProperty({
        description: 'Optional text/caption for the voice message',
        example: 'Good night my love ❤️',
        required: false,
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        description: 'Optional mood for the voice message',
        example: 'love',
        required: false,
        enum: PET_IMAGE_MOODS,
    })
    @IsOptional()
    @IsString()
    mood?: PetImageMood | string;
}
