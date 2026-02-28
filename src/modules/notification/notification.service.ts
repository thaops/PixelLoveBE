import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NotificationSettings, NotificationSettingsDocument } from './schemas/notification-settings.schema';
import { NotificationLog, NotificationLogDocument } from './schemas/notification-log.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { UserDevice, UserDeviceDocument } from '../device/schemas/user-device.schema';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly ONESIGNAL_APP_ID: string;
    private readonly ONESIGNAL_API_KEY: string;

    constructor(
        @InjectModel(NotificationSettings.name) private settingsModel: Model<NotificationSettingsDocument>,
        @InjectModel(NotificationLog.name) private logModel: Model<NotificationLogDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(UserDevice.name) private deviceModel: Model<UserDeviceDocument>,
        private configService: ConfigService,
    ) {
        this.ONESIGNAL_APP_ID = this.configService.get<string>('ONESIGNAL_APP_ID') || '60defdbb-19b7-43bb-9447-183d69b855d6';
        this.ONESIGNAL_API_KEY = this.configService.get<string>('ONESIGNAL_API_KEY') || 'os_v2_app_mdpp3oyzw5b3xfchda6wtocv23yiirw4uz5etmelyg6rwzcgpphp7wjop4ovps3ugeqz4famd24pg6yn5yskgmn5rc52if5d7serzra';
    }

    private async canSend(userId: string, type: string, minutes: number): Promise<boolean> {
        const lastLog = await this.logModel.findOne({ userId, type }).sort({ sentAt: -1 }).lean();
        if (!lastLog) return true;

        const diffMs = Date.now() - new Date(lastLog.sentAt).getTime();
        return diffMs >= minutes * 60 * 1000;
    }

    private async getSettings(userId: string): Promise<NotificationSettingsDocument> {
        let settings = await this.settingsModel.findOne({ userId });
        if (!settings) {
            settings = await this.settingsModel.create({ userId });
        }
        return settings;
    }

    private async sendPush(playerIds: string[], title: string, message: string, data: any): Promise<any> {
        if (!playerIds.length || !this.ONESIGNAL_API_KEY) return { success: false, error: 'No player IDs or API key' };

        try {
            const response = await axios.post(
                'https://onesignal.com/api/v1/notifications',
                {
                    app_id: this.ONESIGNAL_APP_ID,
                    include_player_ids: playerIds,
                    headings: { en: title, vi: title },
                    contents: { en: message, vi: message },
                    data,
                },
                {
                    headers: {
                        Authorization: `Key ${this.ONESIGNAL_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send push: ${error.message}`, error.response?.data);
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    async sendToUser(userId: string, title: string, message: string, data: any): Promise<any> {
        const devices = await this.deviceModel.find({ userId, isActive: true }).lean();
        const playerIds = devices.map(d => d.onesignalPlayerId).filter(Boolean);
        if (playerIds.length > 0) {
            return await this.sendPush(playerIds, title, message, data);
        }
        return { success: false, error: 'No active devices found' };
    }

    async sendInteractionPush(actorUserId: string) {
        const actor = await this.userModel.findById(actorUserId).lean() as any;
        if (!actor || !actor.partnerId) return;

        const settings = await this.getSettings(actor.partnerId.toString());
        if (!settings.interaction) return;

        const canPush = await this.canSend(actor.partnerId.toString(), 'interaction', 5);
        if (!canPush) return;

        const title = '💌 Người ấy vừa tương tác';
        const message = `${actor.nickname || actor.displayName || 'Người ấy'} vừa gửi điều gì đó cho bạn`;

        await this.sendToUser(actor.partnerId.toString(), title, message, {
            type: 'interaction',
            actorId: actorUserId,
        });

        await this.logModel.create({ userId: actor.partnerId.toString(), type: 'interaction' });
    }

    async sendStreakWarning(userId: string, hoursToBreak: number) {
        const settings = await this.getSettings(userId);
        if (!settings.streakWarning) return;

        const canPush = await this.canSend(userId, 'streak_warning', 12 * 60);
        if (!canPush) return;

        const title = '🔥 Sắp mất streak';
        const message = `Còn ${hoursToBreak}h để giữ lửa`;

        await this.sendToUser(userId, title, message, { type: 'streak_warning' });
        await this.logModel.create({ userId, type: 'streak_warning' });
    }

    async sendMilestone(coupleId: string, days: number) {
        const partners = await this.userModel.find({ coupleRoomId: coupleId }).lean() as any[];

        const title = '🔥 Streak mới!';
        const message = `Hai bạn đã giữ lửa ${days} ngày`;

        for (const partner of partners) {
            const settings = await this.getSettings(partner._id.toString());
            if (!settings.milestones) continue;

            await this.sendToUser(partner._id.toString(), title, message, {
                type: 'streak_milestone',
                days,
            });
        }
    }

    async sendPartnerOpen(actorUserId: string) {
        const actor = await this.userModel.findById(actorUserId).lean() as any;
        if (!actor || !actor.partnerId) return;

        const partner = await this.userModel.findById(actor.partnerId).lean() as any;
        if (!partner) return;

        // Production check: Don't push if partner is recently online (< 2m)
        if (partner.lastActiveAt) {
            const diffMs = Date.now() - new Date(partner.lastActiveAt).getTime();
            if (diffMs < 2 * 60 * 1000) return;
        }

        const settings = await this.getSettings(partner._id.toString());
        if (!settings.partnerOpen) return;

        const canPush = await this.canSend(partner._id.toString(), 'partner_open', 6 * 60);
        if (!canPush) return;

        const title = '👀 Người ấy vừa vào app';
        const message = `${actor.nickname || actor.displayName || 'Người ấy'} vừa vào app`;

        await this.sendToUser(partner._id.toString(), title, message, { type: 'partner_open' });
        await this.logModel.create({ userId: partner._id.toString(), type: 'partner_open' });
    }

    async sendStreakBroken(coupleId: string) {
        const partners = await this.userModel.find({ coupleRoomId: coupleId }).lean() as any[];
        const title = '💔 Streak đã mất';
        const message = 'Hai bạn đã để lạc mất ngọn lửa rồi';

        for (const partner of partners) {
            const canPush = await this.canSend(partner._id.toString(), 'streak_broken', 24 * 60);
            if (!canPush) continue;

            await this.sendToUser(partner._id.toString(), title, message, { type: 'streak_broken' });
            await this.logModel.create({ userId: partner._id.toString(), type: 'streak_broken' });
        }
    }
}
