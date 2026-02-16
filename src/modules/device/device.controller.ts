import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DeviceController {
    constructor(private readonly deviceService: DeviceService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register or update a device' })
    async register(
        @CurrentUser() user: any,
        @Body() data: { deviceId: string; platform: string; onesignalPlayerId: string; appVersion?: string },
    ) {
        return this.deviceService.register(user._id, data);
    }

    @Post('ping')
    @ApiOperation({ summary: 'Ping device activity' })
    async ping(
        @CurrentUser() user: any,
        @Body('deviceId') deviceId: string,
    ) {
        return this.deviceService.ping(user._id, deviceId);
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout a device (deactivate push)' })
    async logout(
        @CurrentUser() user: any,
        @Body('deviceId') deviceId: string,
    ) {
        return this.deviceService.logout(user._id, deviceId);
    }
}
