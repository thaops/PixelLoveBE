import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({
    description: 'Note content text',
    example: 'Em nhớ anh 🐶',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}

