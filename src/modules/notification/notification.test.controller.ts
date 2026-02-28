import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

class TestPushDto {
    @ApiProperty({ example: 'Hello!', description: 'Title of the push' })
    title: string;

    @ApiProperty({ example: 'This is a test notification.', description: 'Message body' })
    message: string;
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
        await this.notificationService.sendToUser(
            userId,
            body.title || 'Test Push',
            body.message || 'Hệ thống gửi thông báo đến bạn thành công!',
            { type: 'test' }
        );
        return { success: true, message: 'Push sent to your device via OneSignal' };
    }
}
