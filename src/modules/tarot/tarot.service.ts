import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyTarot, DailyTarotDocument } from './schemas/tarot.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { NotificationService } from '../notification/notification.service';
import { StreakService } from '../streak/streak.service';
import { EventsGateway } from '../events/events.gateway';
import { TarotAiService } from './tarot-ai.service';
import dayjs from 'dayjs';

@Injectable()
export class TarotService {
    private readonly logger = new Logger(TarotService.name);

    constructor(
        @InjectModel(DailyTarot.name) private tarotModel: Model<DailyTarotDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(CoupleRoom.name) private coupleModel: Model<CoupleRoomDocument>,
        private notificationService: NotificationService,
        private streakService: StreakService,
        private eventsGateway: EventsGateway,
        private tarotAiService: TarotAiService,
    ) { }

    private getTodayStr(): string {
        return dayjs().format('YYYY-MM-DD');
    }

    async getTodayStatus(user: any) {
        if (!user.coupleRoomId) {
            throw new ForbiddenException('Couple required');
        }

        const today = this.getTodayStr();
        const tarot = await this.tarotModel.findOne({ coupleId: user.coupleRoomId, date: today });

        if (!tarot) {
            return {
                date: today,
                status: 'IDLE',
                myCard: null,
                partnerSelected: false,
                partnerId: user.partnerId
            };
        }

        const isUserA = tarot.userAId === user._id.toString();
        const myCard = isUserA ? tarot.userACard : tarot.userBCard;
        const partnerCard = isUserA ? tarot.userBCard : tarot.userACard;

        let status = 'IDLE';
        if (tarot.revealedAt) {
            status = 'REVEALED';
        } else if (tarot.readyAt) {
            status = 'READY';
        } else if (tarot.userACard || tarot.userBCard) {
            status = 'WAITING';
        }

        return {
            date: tarot.date,
            status,
            myCard: myCard || null,
            partnerSelected: !!partnerCard,
            partnerId: user.partnerId,
            result: status === 'REVEALED' ? {
                cardA: tarot.userACard,
                cardB: tarot.userBCard,
                text: tarot.resultText,
                question: tarot.resultQuestion
            } : null
        };
    }

    async selectCard(user: any, cardId: number) {
        if (!user.coupleRoomId) {
            throw new ForbiddenException('Couple required');
        }

        if (cardId < 1 || cardId > 3) {
            throw new BadRequestException('Invalid cardId (1-3)');
        }

        const today = this.getTodayStr();
        let tarot = await this.tarotModel.findOne({ coupleId: user.coupleRoomId, date: today });

        if (tarot && tarot.expired) {
            throw new BadRequestException('Tarot session expired');
        }

        if (!tarot) {
            const partner = await this.userModel.findById(user.partnerId);
            tarot = new this.tarotModel({
                coupleId: user.coupleRoomId,
                date: today,
                userAId: user._id.toString(),
                userBId: partner ? partner._id.toString() : null,
            });
        }

        const isUserA = tarot.userAId === user._id.toString();
        if ((isUserA && tarot.userACard) || (!isUserA && tarot.userBCard)) {
            throw new BadRequestException('Card already selected today');
        }

        if (isUserA) {
            tarot.userACard = cardId;
            tarot.userASelectedAt = new Date();
        } else {
            tarot.userBCard = cardId;
            tarot.userBSelectedAt = new Date();
        }

        const bothSelected = !!(tarot.userACard && tarot.userBCard);
        if (bothSelected) {
            tarot.readyAt = new Date();
        }

        await tarot.save();

        this.eventsGateway.emitToUser(user.partnerId, bothSelected ? 'tarotReady' : 'tarotSelected', {
            by: user._id.toString()
        });

        if (bothSelected) {
            // Trigger AI in background
            this.processAiResult(tarot.id);
        } else {
            this.notificationService.sendToUser(user.partnerId, '🔮 Tarot Sync', 'Người ấy đang đợi bạn rút tarot đó!', { type: 'tarot' });
        }

        return {
            status: bothSelected ? 'READY' : 'WAITING',
            partnerSelected: !!(isUserA ? tarot.userBCard : tarot.userACard)
        };
    }

    /**
     * Background AI process to avoid blocking UI
     */
    private async processAiResult(tarotId: string) {
        try {
            const tarot = await this.tarotModel.findById(tarotId);
            if (!tarot || tarot.aiGenerated || tarot.aiGenerating) return;

            const streak = await this.streakService.getStreak(tarot.coupleId);
            const couple = await this.coupleModel.findById(tarot.coupleId).lean();
            const userA = await this.userModel.findById(tarot.userAId).lean();
            const userB = await this.userModel.findById(tarot.userBId).lean();

            const pickedFirst = tarot.userASelectedAt < tarot.userBSelectedAt ? (userA?.nickname || userA?.displayName || 'User A') : (userB?.nickname || userB?.displayName || 'User B');

            const togetherDays = couple?.startDate ? dayjs().diff(dayjs(couple.startDate), 'day') : 0;

            await this.tarotModel.findByIdAndUpdate(tarotId, { $set: { aiGenerating: true } });

            const result = await this.tarotAiService.generateTarotResult(
                tarot.userACard,
                tarot.userBCard,
                {
                    names: [userA?.nickname || userA?.displayName || 'User A', userB?.nickname || userB?.displayName || 'User B'],
                    streak: streak.days,
                    togetherDays,
                    pickedFirst
                }
            );

            if (result) {
                await this.tarotModel.findByIdAndUpdate(tarotId, {
                    $set: {
                        resultText: result.text,
                        resultQuestion: result.question,
                        aiGenerated: true,
                        aiGenerating: false,
                        aiError: false
                    }
                });
                this.logger.log(`AI Result generated for couple ${tarot.coupleId}`);
            } else {
                throw new Error('AI Generation returned null');
            }
        } catch (error) {
            this.logger.error(`Background AI process failed: ${error.message}`);
            await this.tarotModel.findByIdAndUpdate(tarotId, {
                $set: { aiGenerating: false, aiError: true }
            });
        }
    }

    async reveal(user: any) {
        if (!user.coupleRoomId) {
            throw new ForbiddenException('Couple required');
        }

        const today = this.getTodayStr();
        const tarot = await this.tarotModel.findOne({ coupleId: user.coupleRoomId, date: today });

        if (!tarot || !tarot.readyAt) {
            throw new BadRequestException('Tarot is not ready to reveal');
        }

        // Fallback logic if AI is not ready or failed
        if (!tarot.aiGenerated) {
            if (!tarot.resultText) {
                const fallback = this.tarotAiService.getFallbackResult(tarot.userACard, tarot.userBCard);
                tarot.resultText = fallback.text;
                tarot.resultQuestion = fallback.question;
            }
            tarot.aiGenerated = true;
        }

        if (!tarot.revealedAt) {
            tarot.revealedAt = new Date();
        }

        if (!tarot.streakApplied) {
            await this.streakService.recordInteraction(user._id.toString(), user.coupleRoomId);
            tarot.streakApplied = true;
        }

        await tarot.save();

        const streak = await this.streakService.getStreak(user.coupleRoomId);

        const result = {
            cardA: tarot.userACard,
            cardB: tarot.userBCard,
            text: tarot.resultText,
            question: tarot.resultQuestion,
            streak: streak.days
        };

        this.eventsGateway.emitToCoupleRoom(user.coupleRoomId, 'tarotReveal', result);

        return result;
    }

    async expireDailyTarots() {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        const result = await this.tarotModel.updateMany(
            { date: yesterday, readyAt: null, expired: false },
            { $set: { expired: true } }
        );
        this.logger.log(`Expired ${result.modifiedCount} tarot sessions from ${yesterday}`);
    }

    async sendReminders() {
        const today = this.getTodayStr();
        const unfinished = await this.tarotModel.find({
            date: today,
            readyAt: null,
            expired: false
        });

        for (const tarot of unfinished) {
            if (tarot.userAId && !tarot.userACard) {
                await this.notificationService.sendToUser(tarot.userAId, '🔮 Tarot Hàng Ngày', 'Đừng quên rút lá tarot hôm nay để giữ lửa nhé!', { type: 'tarot_reminder' });
            }
            if (tarot.userBId && !tarot.userBCard) {
                await this.notificationService.sendToUser(tarot.userBId, '🔮 Tarot Hàng Ngày', 'Đừng quên rút lá tarot hôm nay để giữ lừa nhé!', { type: 'tarot_reminder' });
            }
        }
    }
}
