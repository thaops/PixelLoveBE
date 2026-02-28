import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class SendReactionDto {
    @ApiProperty({ example: '😍', description: 'Emoji reaction string' })
    @IsString()
    @IsNotEmpty()
    emoji: string;

    @ApiProperty({ example: 5, description: 'Number of times this emoji was pressed (throttled/debounced from frontend)' })
    @IsNumber()
    @Min(1)
    count: number;
}
