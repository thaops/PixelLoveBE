import { IsString, IsOptional } from 'class-validator';

/**
 * Create Couple DTO
 * Used when creating a new couple room
 */
export class CreateCoupleDto {
  @IsString()
  @IsOptional()
  petType?: string; // Optional: type of pet to start with
}

