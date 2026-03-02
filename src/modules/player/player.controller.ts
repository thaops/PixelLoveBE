import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { PlayTrackDto } from './dto/play-track.dto';
import { SeekDto } from './dto/seek.dto';

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
        return this.playerService.getPlayerState(roomId);
    }

    @Get('queue')
    @ApiOperation({ summary: 'Lấy danh sách bài hát trong Queue' })
    async getQueue(@Req() req: any) {
        const roomId = req.user.roomId || req.user.coupleRoomId;
        return this.playerService.getQueue(roomId);
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
}
