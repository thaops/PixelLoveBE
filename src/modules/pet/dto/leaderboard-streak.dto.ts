import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardMemberDto {
    @ApiProperty({
        description: 'User ID',
        example: 'u_123',
    })
    userId: string;

    @ApiProperty({
        description: 'User display name',
        example: 'An',
    })
    name: string;

    @ApiProperty({
        description: 'User avatar URL',
        example: 'https://...',
    })
    avatarUrl: string;
}

export class LeaderboardPetInfoDto {
    @ApiProperty({
        description: 'Pet level',
        example: 12,
    })
    level: number;
}

export class LeaderboardStreakItemDto {
    @ApiProperty({
        description: 'Couple ID',
        example: '675...',
    })
    coupleId: string;

    @ApiProperty({
        description: 'Couple members info',
        type: [LeaderboardMemberDto],
    })
    members: LeaderboardMemberDto[];

    @ApiProperty({
        description: 'Pet info',
        type: LeaderboardPetInfoDto,
    })
    pet: LeaderboardPetInfoDto;

    @ApiProperty({
        description: 'Room background Image URL (default if not set)',
        example: 'https://...',
    })
    backgroundUrl: string;

    @ApiProperty({
        description: 'Current streak',
        example: 30,
    })
    streak: number;

    @ApiProperty({
        description: 'Days in love',
        example: 100,
    })
    loveDays: number;

    @ApiProperty({
        description: 'Rank position',
        example: 1,
    })
    rank: number;
}

export class LeaderboardStreakResponseDto {
    @ApiProperty({
        description: 'Current user rank (if available)',
        example: 5,
        required: false,
    })
    myRank?: number;

    @ApiProperty({
        description: 'Current user streak',
        example: 7,
        required: false,
    })
    myStreak?: number;

    @ApiProperty({
        description: 'Leaderboard list',
        type: [LeaderboardStreakItemDto],
    })
    items: LeaderboardStreakItemDto[];
}
