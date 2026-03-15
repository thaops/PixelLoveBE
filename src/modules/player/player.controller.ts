import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PlayTrackDto } from './dto/play-track.dto';
import { SeekDto } from './dto/seek.dto';
import { TimerDto } from './dto/timer.dto';

@ApiTags('Player (Room Sync Audio)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('player')
export class PlayerController {
    constructor(private readonly playerService: PlayerService) { }

    @Get('state')
    @ApiOperation({ summary: 'Lấy trạng thái Player hiện tại của Room' })
    async getPlayerState(@Req() req: any) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        return this.playerService.getPlayerState(roomId, userId);
    }

    @Get('queue')
    @ApiOperation({ summary: 'Lấy danh sách bài hát trong Queue (có phân trang & tìm kiếm)' })
    @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại (mặc định 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang (mặc định 20)' })
    @ApiQuery({ name: 'search', required: false, description: 'Từ khóa tìm kiếm theo tên bài hát' })
    async getQueue(
        @Req() req: any,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string
    ) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        return this.playerService.getQueue(roomId, Number(page) || 1, Number(limit) || 20, search);
    }

    @Post('play')
    @ApiOperation({ summary: 'Phát một bài hát trong Queue' })
    @ApiBody({ type: PlayTrackDto })
    async play(@Req() req: any, @Body() playDto: PlayTrackDto) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        return this.playerService.play(roomId, playDto, userId);
    }

    @Post('pause')
    @ApiOperation({ summary: 'Tạm dừng bài hát hiện tại' })
    async pause(@Req() req: any) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        return this.playerService.pause(roomId, userId);
    }

    @Post('seek')
    @ApiOperation({ summary: 'Tua bài hát đến thời điểm cụ thể' })
    @ApiBody({ type: SeekDto })
    async seek(@Req() req: any, @Body() seekDto: SeekDto) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        return this.playerService.seek(roomId, seekDto, userId);
    }

    @Post('next')
    @ApiOperation({ summary: 'Chuyển bài hát tiếp theo' })
    async next(@Req() req: any) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        return this.playerService.next(roomId, userId);
    }

    @Post('previous')
    @ApiOperation({ summary: 'Quay lại bài hát trước đó' })
    async previous(@Req() req: any) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        return this.playerService.previous(roomId, userId);
    }

    @Post('timer')
    @ApiOperation({ summary: 'Hẹn giờ tắt nhạc cho cả 2 người' })
    @ApiBody({ type: TimerDto })
    async setTimer(@Req() req: any, @Body() timerDto: TimerDto) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        return this.playerService.setTimer(roomId, timerDto);
    }
}
