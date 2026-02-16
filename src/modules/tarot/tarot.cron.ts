import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TarotService } from './tarot.service';

@Injectable()
export class TarotCron {
    private readonly logger = new Logger(TarotCron.name);

    constructor(private readonly tarotService: TarotService) { }

    // 21:00 everyday - Push reminder
    @Cron('0 21 * * *')
    async handleReminders() {
        this.logger.log('Running daily tarot reminders...');
        await this.tarotService.sendReminders();
    }

    // 23:59 everyday - Expire sessions
    @Cron('59 23 * * *')
    async handleExpiration() {
        this.logger.log('Running daily tarot expiration...');
        await this.tarotService.expireDailyTarots();
    }
}
