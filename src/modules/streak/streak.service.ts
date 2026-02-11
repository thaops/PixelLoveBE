import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Streak, StreakDocument } from './schemas/streak.schema';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { StreakResponseDto } from './dto/streak-response.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class StreakService {
    private readonly logger = new Logger(StreakService.name);
    private readonly MILESTONES = [3, 7, 10, 30, 50, 100];

    constructor(
        @InjectModel(Streak.name) private streakModel: Model<StreakDocument>,
        @InjectModel(CoupleRoom.name) private coupleModel: Model<CoupleRoomDocument>,
        private notificationService: NotificationService,
    ) { }

    async recordInteraction(userId: string, coupleId: string) {
        if (!coupleId) return;

        let streak = await this.streakModel.findOne({ coupleId });
        if (!streak) {
            streak = await this.streakModel.create({ coupleId });
        }

        const couple = await this.coupleModel.findById(coupleId);
        if (!couple || !couple.partners || couple.partners.length < 2) return;

        const side = couple.partners[0].toString() === userId.toString() ? 'A' : 'B';
        const now = new Date();

        const oldA = streak.lastInteractionA;
        const oldB = streak.lastInteractionB;
        const oldLatest = (oldA && oldB)
            ? (oldA > oldB ? oldA : oldB)
            : (oldA || oldB);

        if (oldLatest) {
            const diffMs = now.getTime() - oldLatest.getTime();
            if (diffMs > 24 * 60 * 60 * 1000) {
                if (streak.currentDays > 0) {
                    await this.notificationService.sendStreakBroken(coupleId);
                }
                streak.currentDays = 0;
                streak.lastCountedDate = null;
            }
        }

        if (side === 'A') {
            streak.lastInteractionA = now;
        } else {
            streak.lastInteractionB = now;
        }

        if (streak.lastInteractionA && streak.lastInteractionB) {
            const diffA = now.getTime() - streak.lastInteractionA.getTime();
            const diffB = now.getTime() - streak.lastInteractionB.getTime();

            if (diffA <= 24 * 60 * 60 * 1000 && diffB <= 24 * 60 * 60 * 1000) {
                const today = now.toISOString().split('T')[0];
                if (streak.lastCountedDate !== today) {
                    streak.currentDays += 1;
                    streak.lastCountedDate = today;

                    // Milestone check
                    if (this.MILESTONES.includes(streak.currentDays)) {
                        await this.notificationService.sendMilestone(coupleId, streak.currentDays);
                    }
                }
            }
        }

        await streak.save();
    }

    async getStreak(coupleId: string): Promise<StreakResponseDto> {
        if (!coupleId) {
            return { days: 0, level: 'broken', missingSide: null, hoursToBreak: 0 };
        }

        const streak = await this.streakModel.findOne({ coupleId });
        if (!streak) {
            return { days: 0, level: 'broken', missingSide: null, hoursToBreak: 0 };
        }

        const now = new Date();
        const lastA = streak.lastInteractionA;
        const lastB = streak.lastInteractionB;
        const latest = (lastA && lastB) ? (lastA > lastB ? lastA : lastB) : (lastA || lastB);

        if (!latest) {
            return { days: 0, level: 'broken', missingSide: null, hoursToBreak: 0 };
        }

        const diffHours = (now.getTime() - latest.getTime()) / (1000 * 60 * 60);

        let level = 'strong';
        if (diffHours >= 24) level = 'broken';
        else if (diffHours >= 12) level = 'warning';

        let missingSide: string | null = null;
        const hA = lastA ? (now.getTime() - lastA.getTime()) / (1000 * 60 * 60) : 999;
        const hB = lastB ? (now.getTime() - lastB.getTime()) / (1000 * 60 * 60) : 999;

        if (hA > 24 && hB <= 24) missingSide = 'A';
        else if (hB > 24 && hA <= 24) missingSide = 'B';

        const hoursToBreak = Math.max(0, 24 - diffHours);

        return {
            days: level === 'broken' ? 0 : streak.currentDays,
            level,
            missingSide,
            hoursToBreak: Math.floor(hoursToBreak),
        };
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async checkStreakWarnings() {
        this.logger.log('Checking streak warnings...');
        const now = new Date();
        const streaks = await this.streakModel.find({ currentDays: { $gt: 0 } });

        for (const streak of streaks) {
            const lastA = streak.lastInteractionA;
            const lastB = streak.lastInteractionB;
            const latest = (lastA && lastB) ? (lastA > lastB ? lastA : lastB) : (lastA || lastB);

            if (!latest) continue;

            const diffHours = (now.getTime() - latest.getTime()) / (1000 * 60 * 60);

            // Warning if > 21 hours passed (3h left)
            if (diffHours >= 21 && diffHours < 24) {
                const hA = lastA ? (now.getTime() - lastA.getTime()) / (1000 * 60 * 60) : 999;
                const hB = lastB ? (now.getTime() - lastB.getTime()) / (1000 * 60 * 60) : 999;

                const couple = await this.coupleModel.findById(streak.coupleId);
                if (!couple || !couple.partners) continue;

                if (hA >= 21) {
                    await this.notificationService.sendStreakWarning(couple.partners[0], Math.floor(24 - hA));
                }
                if (hB >= 21) {
                    await this.notificationService.sendStreakWarning(couple.partners[1], Math.floor(24 - hB));
                }
            }
        }
    }
}
