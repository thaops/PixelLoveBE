import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Login DTO
 * Used for OAuth login (Google)
 */
export class LoginDto {
  @ApiProperty({
    description: 'Google ID token from client',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

