import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TarotService } from './tarot.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Tarot')
@Controller('tarot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TarotController {
    constructor(private readonly tarotService: TarotService) { }

    @Get('today')
    @ApiOperation({ summary: 'Get today tarot status for couple' })
    async getToday(@CurrentUser() user: any) {
        return this.tarotService.getTodayStatus(user);
    }

    @Post('select')
    @ApiOperation({ summary: 'Select a daily tarot card (1-3)' })
    async select(@CurrentUser() user: any, @Body() body: { cardId: number }) {
        return this.tarotService.selectCard(user, body.cardId);
    }

    @Post('reveal')
    @ApiOperation({ summary: 'Reveal tarot result when both selected' })
    async reveal(@CurrentUser() user: any) {
        return this.tarotService.reveal(user);
    }
}
