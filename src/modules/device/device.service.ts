import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDevice, UserDeviceDocument } from './schemas/user-device.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DeviceService {
    constructor(
        @InjectModel(UserDevice.name) private deviceModel: Model<UserDeviceDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private notificationService: NotificationService,
    ) { }

    async register(userId: string, data: { deviceId: string; platform: string; onesignalPlayerId: string; appVersion?: string }) {
        const now = new Date();

        // Upsert device
        const device = await this.deviceModel.findOneAndUpdate(
            { deviceId: data.deviceId },
            {
                $set: {
                    userId,
                    platform: data.platform,
                    onesignalPlayerId: data.onesignalPlayerId,
                    appVersion: data.appVersion,
                    isActive: true,
                    lastActiveAt: now,
                },
            },
            { upsert: true, new: true },
        );

        // Update user lastActiveAt
        await this.userModel.findByIdAndUpdate(userId, { $set: { lastActiveAt: now } });

        return device;
    }

    async ping(userId: string, deviceId: string) {
        const now = new Date();

        const device = await this.deviceModel.findOneAndUpdate(
            { deviceId, userId },
            { $set: { lastActiveAt: now, isActive: true } },
            { new: true },
        );

        await this.userModel.findByIdAndUpdate(userId, { $set: { lastActiveAt: now } });

        // Check and push "Partner open app" through notification service
        // Phase 1: Keep calling here, but logic will evolve in notification service
        await this.notificationService.sendPartnerOpen(userId);

        return { success: true };
    }

    async logout(userId: string, deviceId: string) {
        await this.deviceModel.updateOne(
            { deviceId, userId },
            { $set: { isActive: false } },
        );
        return { success: true };
    }

    async cleanupUserDevices(userId: string) {
        await this.deviceModel.deleteMany({ userId });
    }

    async getActiveDevices(userId: string): Promise<UserDeviceDocument[]> {
        return this.deviceModel.find({ userId, isActive: true }).lean() as any;
    }
}
