import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

/**
 * Update Profile DTO
 * Used for completing user profile after initial OAuth login
 */
export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string; // Date of birth in ISO format (YYYY-MM-DD)
}

