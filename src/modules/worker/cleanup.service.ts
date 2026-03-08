import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    @Cron(CronExpression.EVERY_HOUR)
    handleCron() {
        this.logger.log('🧹 Cleanup Job: Deleting temporary YouTube audio files...');

        const tempDir = path.join(os.tmpdir(), 'youtube');

        if (fs.existsSync(tempDir)) {
            try {
                const files = fs.readdirSync(tempDir);
                let count = 0;

                for (const file of files) {
                    const filePath = path.join(tempDir, file);
                    // Có thể thêm điều kiện xoá file cũ quá 1 giờ
                    // const stat = fs.statSync(filePath);
                    // if (Date.now() - stat.mtimeMs > 60 * 60 * 1000)
                    try {
                        fs.unlinkSync(filePath);
                        count++;
                    } catch (error) {
                        this.logger.error(`❌ Failed to delete ${filePath}: ${error.message}`);
                    }
                }

                this.logger.log(`✅ Cleanup complete: Deleted ${count} files.`);
            } catch (err) {
                this.logger.error(`❌ Cleanup Job Failed: ${err.message}`);
            }
        }
    }
}
