import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * Join Couple DTO
 * Used when joining an existing couple room with a code
 */
export class JoinCoupleDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string; // 6-character room code
}

