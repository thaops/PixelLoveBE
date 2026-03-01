import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SeekDto {
    @ApiProperty({ description: 'Thời gian seek đến tính bằng giây (seconds)', example: 60 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    time: number;
}
