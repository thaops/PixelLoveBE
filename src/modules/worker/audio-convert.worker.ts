// @ts-ignore
import { Processor, WorkerHost } from '@nestjs/bullmq';
// @ts-ignore
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Track, TrackDocument } from '../tracks/schemas/track.schema';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { EventsGateway } from '../events/events.gateway';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Processor('audio-convert', { concurrency: 3 })
@Injectable()
export class AudioConvertWorker extends WorkerHost {
    private readonly logger = new Logger(AudioConvertWorker.name);
    private s3Client: S3Client;

    constructor(
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        private configService: ConfigService,
        private readonly eventsGateway: EventsGateway,
    ) {
        super();
        this.logger.log('💿 Audio Convert Worker Initialized');

        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_REGION') || 'ap-southeast-1',
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
            },
        });
    }

    private emitProgress(roomId: string, trackId: string, progress: number, message: string) {
        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:progress', {
            trackId,
            progress,
            message
        });
    }

    private async uploadToS3(filePath: string, videoId: string): Promise<string> {
        const bucket = this.configService.get<string>('AWS_S3_BUCKET_NAME');
        const region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';
        const fileStream = fs.createReadStream(filePath);

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: `youtube_tracks/${videoId}.mp3`,
            Body: fileStream,
            ContentType: 'audio/mpeg',
            ACL: 'public-read' // Cấp file public
        });

        await this.s3Client.send(command);
        return `https://${bucket}.s3.${region}.amazonaws.com/youtube_tracks/${videoId}.mp3`;
    }

    private async getMetadata(youtubeUrl: string, cookiesPath?: string) {
        let cmd = `yt-dlp --dump-json --no-playlist ${youtubeUrl}`;
        if (cookiesPath && fs.existsSync(cookiesPath)) {
            cmd = `yt-dlp --cookies "${cookiesPath}" --dump-json --no-playlist ${youtubeUrl}`;
        }

        const { stdout } = await execPromise(cmd);
        const data = JSON.parse(stdout);
        return {
            title: data.title,
            duration: data.duration,
            thumbnail: data.thumbnail
        };
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { trackId, youtubeUrl, roomId, youtubeVideoId } = job.data;
        const videoId = youtubeVideoId;
        this.logger.log(`🔄 Processing job ${job.id} for video ${videoId} (yt-dlp S3 Mode)`);

        try {
            const existing = await this.trackModel.findOne({
                youtubeVideoId: videoId,
                status: 'ready'
            });

            if (existing && existing.audioUrl) {
                this.logger.log(`♻️ Video ${videoId} already converted. Skipping yt-dlp.`);

                await this.trackModel.updateMany(
                    { youtubeVideoId: videoId, status: 'processing' },
                    {
                        status: 'ready',
                        audioUrl: existing.audioUrl,
                        title: existing.title,
                        thumbnail: existing.thumbnail,
                        duration: existing.duration,
                        isStreamUrl: existing.isStreamUrl,
                        expiredAt: existing.expiredAt
                    }
                );

                const updatedTracks = await this.trackModel.find({ youtubeVideoId: videoId, status: 'ready', audioUrl: existing.audioUrl });
                for (const t of updatedTracks) {
                    this.eventsGateway.emitToCoupleRoom(t.roomId.toString(), 'queue:update', {
                        type: 'ready',
                        trackId: t._id.toString(),
                        status: 'ready',
                        track: t
                    });
                    this.emitProgress(t.roomId.toString(), t._id.toString(), 100, 'Hoàn thành!');
                }

                return { success: true, url: existing.audioUrl };
            }

            const notifyAllWaiting = async (progress: number, message: string) => {
                const tracks = await this.trackModel.find({ youtubeVideoId: videoId, status: 'processing' });
                for (const t of tracks) {
                    this.emitProgress(t.roomId.toString(), t._id.toString(), progress, message);
                }
            };

            await notifyAllWaiting(10, 'Đang trích xuất metadata...');

            // Lấy Metadata
            let title = '';
            let duration = 0;
            let thumbnail = '';
            const cookiesPath = path.join(process.cwd(), 'configs', 'cookies.txt');

            try {
                const meta = await this.getMetadata(youtubeUrl);
                title = meta.title;
                duration = meta.duration;
                thumbnail = meta.thumbnail;
            } catch (err) {
                this.logger.warn(`Lấy info lỗi, thử lại với cookies.txt...`);
                const metaFallback = await this.getMetadata(youtubeUrl, cookiesPath);
                title = metaFallback.title;
                duration = metaFallback.duration;
                thumbnail = metaFallback.thumbnail;
            }

            await notifyAllWaiting(30, 'Đang tải audio và convert sang mp3...');

            const tempDir = path.join(os.tmpdir(), 'youtube');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `${videoId}.mp3`);

            // Xoá file cũ nếu đang tồn tại
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            const ytFlags = `--no-playlist --extractor-retries 5 --fragment-retries 5 --concurrent-fragments 5 -x --audio-format mp3 --audio-quality 192K`;

            try {
                this.logger.log(`📥 Downloading (Normal Mode)...`);
                await execPromise(`yt-dlp ${ytFlags} -o "${tempDir}/%(id)s.%(ext)s" ${youtubeUrl}`);
            } catch (error) {
                this.logger.warn(`❌ Normal mode failed: ${error.message}. Fallback to cookies...`);
                if (fs.existsSync(cookiesPath)) {
                    await execPromise(`yt-dlp --cookies "${cookiesPath}" ${ytFlags} -o "${tempDir}/%(id)s.%(ext)s" ${youtubeUrl}`);
                } else {
                    throw new Error('Normal download failed and no cookies.txt found in /configs/');
                }
            }

            if (!fs.existsSync(tempFilePath)) {
                throw new Error('Local file not found after download');
            }

            await notifyAllWaiting(80, 'Đang upload sang S3...');

            let finalAudioUrl = '';
            try {
                finalAudioUrl = await this.uploadToS3(tempFilePath, videoId);
                this.logger.log(`☁️ Uploaded to S3: ${finalAudioUrl}`);

                // Keep temp file for cleanup cron job later or delete immediately to save space?
                // Yêu cầu "cron mỗi 1h delete temp files", nên có thể để lại. Hoặc xoá luôn an toàn hơn.
                // Thôi, không unlink file tmp để cron xóa theo logic user.
            } catch (uploadError) {
                this.logger.error(`❌ Upload S3 failed: ${uploadError.message}`);
                throw uploadError;
            }

            // Update Database for ALL processing tracks
            const updatedResult = await this.trackModel.updateMany(
                { youtubeVideoId: videoId, status: 'processing' },
                {
                    title: title || 'YouTube Track',
                    thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration: duration,
                    status: 'ready',
                    audioUrl: finalAudioUrl,
                    isStreamUrl: false,
                    expiredAt: null,
                }
            );

            this.logger.log(`✅ Updated ${updatedResult.modifiedCount} tracks to READY status`);

            const waitingTracks = await this.trackModel.find({
                youtubeVideoId: videoId,
                status: 'ready',
                audioUrl: finalAudioUrl
            });

            for (const t of waitingTracks) {
                this.eventsGateway.emitToCoupleRoom(t.roomId.toString(), 'queue:update', {
                    type: 'ready',
                    trackId: t._id.toString(),
                    status: 'ready',
                    track: t
                });
                this.emitProgress(t.roomId.toString(), t._id.toString(), 100, 'Hoàn thành!');
            }

            return { success: true, url: finalAudioUrl };

        } catch (error) {
            this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);
            await this.trackModel.updateMany(
                { youtubeVideoId: job.data.youtubeVideoId || videoId, status: 'processing' },
                { status: 'failed' }
            );
            throw error;
        }
    }
}
