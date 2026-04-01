import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { PlayerService } from './player.service';
import { VideoPlayerService, VideoPlayerState } from './video-player.service';
import { EventsGateway } from '../events/events.gateway';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('Player (Room Sync Audio & Video)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('player')
export class PlayerController {
    constructor(
        private readonly playerService: PlayerService,
        private readonly videoPlayerService: VideoPlayerService,
        private readonly eventsGateway: EventsGateway,
    ) { }

    // ─── Video Player (YouTube Watch Together) ──────────────────────────────

    @Get('video/state')
    @ApiOperation({ summary: 'Lấy trạng thái Video Player hiện tại (Realtime + Persist)' })
    async getVideoState(@Req() req: any): Promise<VideoPlayerState | null> {
        const roomId = (req.user.coupleRoomId || req.user.roomId)?.toString();
        if (!roomId) return null;
        const state = await this.videoPlayerService.getOrRestoreState(roomId);
        return state ? this.videoPlayerService.getSyncedState(state) : null;
    }

    @Post('video/add')
    @ApiOperation({ summary: 'Thêm video vào queue (REST API)' })
    @ApiBody({ schema: { properties: { url: { type: 'string' } } } })
    async addVideo(@Req() req: any, @Body('url') url: string) {
        const roomId = (req.user.coupleRoomId || req.user.roomId)?.toString();
        if (!roomId) throw new Error('No room');
        
        const state = await this.videoPlayerService.addVideo(roomId, url);
        
        // Broadcast Socket để đồng bộ thiết bị đối phương
        this.eventsGateway.emitToCoupleRoom(roomId, 'player:queue-updated', {
            queue: state.videoQueue,
            currentIndex: state.currentIndex,
            currentId: state.currentId,
            currentVideoId: state.videoId
        });
        
        return state;
    }

    @Delete('video/remove/:id')
    @ApiOperation({ summary: 'Xóa video khỏi queue (REST API)' })
    async removeVideo(@Req() req: any, @Param('id') id: string) {
        const roomId = (req.user.coupleRoomId || req.user.roomId)?.toString();
        if (!roomId) throw new Error('No room');

        const { state, isRemovingCurrent } = await this.videoPlayerService.removeVideo(roomId, id);

        // Broadcast Socket trạng thái mới nhất cho 2 thiết bị
        if (isRemovingCurrent) {
            this.eventsGateway.emitToCoupleRoom(roomId, 'player:state', this.videoPlayerService.getSyncedState(state));
        } else {
            this.eventsGateway.emitToCoupleRoom(roomId, 'player:queue-updated', {
                queue: state.videoQueue,
                currentIndex: state.currentIndex,
                currentId: state.currentId,
                currentVideoId: state.videoId
            });
        }

        return { success: true };
    }

    // ─── Audio Player (Music Sync) ──────────────────────────────────────────
    
    @Get('state')
    @ApiOperation({ summary: 'Lấy trạng thái Audio Player hiện tại' })
    async getAudioState(@Req() req: any) {
        return this.playerService.getPlayerState(req.user.roomId || req.user.coupleRoomId, req.user._id);
    }

    @Get('queue')
    @ApiOperation({ summary: 'Lấy danh sách nhạc trong queue' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    async getQueue(
        @Req() req: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string
    ) {
        return this.playerService.getQueue(req.user.roomId || req.user.coupleRoomId, page, limit, search);
    }

    @Post('play')
    @ApiOperation({ summary: 'Phát một bài hát' })
    async play(@Req() req: any, @Body() playDto: any) {
        return this.playerService.play(req.user.roomId || req.user.coupleRoomId, playDto, req.user._id);
    }

    @Post('pause')
    @ApiOperation({ summary: 'Tạm dừng' })
    async pause(@Req() req: any) {
        return this.playerService.pause(req.user.roomId || req.user.coupleRoomId, req.user._id);
    }

    @Post('seek')
    @ApiOperation({ summary: 'Tua nhạc' })
    async seek(@Req() req: any, @Body() seekDto: any) {
        return this.playerService.seek(req.user.roomId || req.user.coupleRoomId, seekDto, req.user._id);
    }

    @Post('next')
    @ApiOperation({ summary: 'Bài kế tiếp' })
    async next(@Req() req: any) {
        return this.playerService.next(req.user.roomId || req.user.coupleRoomId, req.user._id);
    }

    @Post('previous')
    @ApiOperation({ summary: 'Bài trước đó' })
    async previous(@Req() req: any) {
        return this.playerService.previous(req.user.roomId || req.user.coupleRoomId, req.user._id);
    }

    @Post('timer')
    @ApiOperation({ summary: 'Hẹn giờ ngủ' })
    async setTimer(@Req() req: any, @Body() timerDto: any) {
        return this.playerService.setTimer(req.user.roomId || req.user.coupleRoomId, timerDto);
    }
}
