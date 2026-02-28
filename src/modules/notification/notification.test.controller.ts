import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

import { IsString, IsOptional } from 'class-validator';

class TestPushDto {
    @ApiProperty({ example: 'Hello!', description: 'Title of the push', required: false })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ example: 'This is a test notification.', description: 'Message body', required: false })
    @IsString()
    @IsOptional()
    message?: string;
}

@ApiTags('Notification Test')
@Controller('notification-test')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationTestController {
    constructor(private readonly notificationService: NotificationService) { }

    @Post('me')
    @ApiOperation({ summary: 'Send a test push to myself' })
    @ApiResponse({ status: 200, description: 'Push sent' })
    async testMe(@CurrentUser() user: any, @Body() body: TestPushDto) {
        const userId = user._id.toString();

        // Diagnostics
        const deviceModel = (this.notificationService as any).deviceModel;
        const devices = await deviceModel.find({ userId, isActive: true }).lean();
        const playerIds = devices.map(d => d.onesignalPlayerId).filter(Boolean);

        await this.notificationService.sendToUser(
            userId,
            body.title || 'Test Push',
            body.message || 'Hệ thống gửi thông báo đến bạn thành công!',
            { type: 'test' }
        );

        return {
            success: true,
            message: 'Push request sent to OneSignal',
            diagnostics: {
                userId,
                activeDevicesCount: devices.length,
                playerIds: playerIds,
                note: playerIds.length === 0 ? 'No active OneSignal Player IDs found for this user. App needs to register device first.' : 'Request sent for the player IDs listed above.'
            }
        };
    }
}
