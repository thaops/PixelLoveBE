import { Controller, Post, Body, Param, ParamData, UseGuards, Req, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { TracksService } from './tracks.service';
import { AddTrackDto } from './dto/add-track.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('Tracks (Room Audio)')
@ApiBearerAuth('JWT-auth')
@Controller('rooms')
export class TracksController {
    constructor(private readonly tracksService: TracksService) { }

    @UseGuards(JwtAuthGuard)
    @Post('/tracks')
    @ApiOperation({ summary: 'Thêm bài hát vào room từ YouTube' })
    @ApiBody({ type: AddTrackDto })
    @ApiResponse({
        status: 201, description: 'Bài hát đang được xử lý chuyển đổi thành MP3', schema: {
            example: {
                trackId: '65e2abc...',
                status: 'processing',
                title: 'Never Gonna Give You Up',
                thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                duration: 212
            }
        }
    })
    @ApiResponse({ status: 400, description: 'URL không hợp lệ hoặc thời lượng quá dài (> 360s).' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy Room.' })
    async addTrackToRoom(
        @Body() addTrackDto: AddTrackDto,
        @Req() req: any,
    ) {
        // req.user from JWT payload, assumes user ID is in req.user.userId or req.user._id
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        const roomId = req.user.roomId || req.user.coupleRoomId;
        return this.tracksService.addTrackToRoom(roomId, userId, addTrackDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('/tracks/:trackId')
    @ApiOperation({ summary: 'Xoá một bài hát khỏi Room (chỉ dành cho người tạo hoặc chủ phòng)' })
    @ApiParam({ name: 'trackId', description: 'ID của Track cần xoá' })
    @ApiResponse({ status: 200, description: 'Đã xoá thành công.' })
    @ApiResponse({ status: 403, description: 'Bạn không có quyền xoá bài hát này' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy Room hoặc Track.' })
    async removeTrackFromRoom(
        @Param('trackId') trackId: string,
        @Req() req: any,
    ) {
        const userId = req.user.userId || req.user._id?.toString() || req.user.id;
        const roomId = req.user.roomId || req.user.coupleRoomId;
        return this.tracksService.removeTrackFromRoom(roomId, userId, trackId);
    }
}
