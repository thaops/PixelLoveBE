import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StreakService } from './streak.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { StreakResponseDto } from './dto/streak-response.dto';

@ApiTags('Streak')
@Controller('streak')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StreakController {
    constructor(private readonly streakService: StreakService) { }

    @Get()
    @ApiOperation({ summary: 'Get current couple streak' })
    @ApiResponse({ status: 200, type: StreakResponseDto })
    async getStreak(@CurrentUser() user: any) {
        if (!user.coupleRoomId) {
            return { days: 0, level: 'broken', missingSide: null, hoursToBreak: 0 };
        }
        return this.streakService.getStreak(user.coupleRoomId);
    }
}
