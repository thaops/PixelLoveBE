// @ts-ignore
import { Processor, WorkerHost } from '@nestjs/bullmq';
// @ts-ignore
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Track, TrackDocument } from '../tracks/schemas/track.schema';
import { v2 as cloudinary } from 'cloudinary';
import { EventsGateway } from '../events/events.gateway';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

import { YoutubeService } from '../youtube/youtube.service';
import axios from 'axios';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfprobePath(ffprobeInstaller.path);

@Processor('audio-convert', { concurrency: 3 })
@Injectable()
export class AudioConvertWorker extends WorkerHost {
    private readonly logger = new Logger(AudioConvertWorker.name);

    constructor(
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        private configService: ConfigService,
        private readonly eventsGateway: EventsGateway,
        private readonly youtubeService: YoutubeService,
    ) {
        super();
        this.logger.log('💿 Audio Convert Worker Initialized (Y2Mate Cloudinary Mode)');

        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    private emitProgress(roomId: string, trackId: string, progress: number, message: string) {
        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:progress', {
            trackId,
            progress,
            message
        });
    }

    private async uploadToCloudinary(filePath: string, videoId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(filePath, {
                resource_type: 'video',
                folder: 'youtube_tracks',
                public_id: videoId,
                overwrite: true,
            }, (error, result) => {
                if (error) return reject(error);
                if (!result) return reject(new Error('Cloudinary upload result is undefined'));
                resolve(result.secure_url);
            });
        });
    }

    private async downloadFromUrl(url: string, destPath: string) {
        const writer = fs.createWriteStream(destPath);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'accept': '*/*',
                'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'origin': 'https://v1.y2mate.nu',
                'referer': 'https://v1.y2mate.nu/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                // Không dùng br để tránh lỗi stream thô nếu không giải nén đúng
                'accept-encoding': 'gzip, deflate',
            }
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(true));
            writer.on('error', reject);
        });
    }

    private async getMetadata(youtubeUrl: string) {
        const cmd = `yt-dlp --dump-json --no-playlist ${youtubeUrl}`;
        const { stdout } = await execPromise(cmd);
        const data = JSON.parse(stdout);
        return {
            title: data.title,
            duration: data.duration,
            thumbnail: data.thumbnail
        };
    }

    private async getAudioDurationFromLocal(filePath: string): Promise<number> {
        return new Promise((resolve) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    this.logger.warn(`FFprobe error: ${err.message}`);
                    return resolve(0);
                }
                const duration = metadata.format.duration || 0;
                resolve(Math.round(duration));
            });
        });
    }

    async process(job: Job<any, any, string>): Promise<any> {
        if (this.configService.get<string>('IS_WORKER') !== 'true') {
            this.logger.warn(`⚠️ Skipped job ${job.id} - Not a worker instance.`);
            return;
        }

        const { youtubeUrl, youtubeVideoId } = job.data;
        const videoId = youtubeVideoId;
        this.logger.log(`🔄 Processing job ${job.id} for video ${videoId} (Y2Mate Cloudinary Mode)`);

        try {
            const existing = await this.trackModel.findOne({
                youtubeVideoId: videoId,
                status: 'ready'
            });

            if (existing && existing.audioUrl) {
                this.logger.log(`♻️ Video ${videoId} already converted. Reusing...`);

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

            let title = '';
            let duration = 0;
            let thumbnail = '';

            try {
                const meta = await this.getMetadata(youtubeUrl);
                title = meta.title;
                duration = meta.duration;
                thumbnail = meta.thumbnail;
            } catch (err) {
                this.logger.warn(`Lấy info metadata lỗi: ${err.message}`);
            }

            await notifyAllWaiting(25, 'Đang chuẩn bị dịch vụ chuyển đổi...');

            let result;
            try {
                // skipCache=true: Luôn lấy link mới ngay lúc tải để không bị 404
                result = await this.youtubeService.convertToMp3(videoId, true);
            } catch (err) {
                this.logger.error(`❌ Y2Mate Convert Error: ${err.message}`);
                throw new Error(`Dịch vụ Y2Mate gặp lỗi: ${err.message}`);
            }

            const downloadUrl = result.downloadURL;
            if (!title) title = result.title;

            if (!downloadUrl) {
                this.logger.error(`❌ Result object is missing downloadUrl property: ${JSON.stringify(result)}`);
                throw new Error('Y2Mate did not return a download URL');
            }

            await notifyAllWaiting(45, 'Đang tải nhạc từ server...');

            const tempDir = path.join(os.tmpdir(), 'youtube');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `${videoId}.mp3`);
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            try {
                this.logger.log(`📥 Starting download: ${title}`);
                await this.downloadFromUrl(downloadUrl, tempFilePath);
            } catch (downloadError) {
                this.logger.error(`❌ Download from Y2Mate failed: ${downloadError.message}`);
                throw new Error(`Không thể tải nhạc từ provider: ${downloadError.message}`);
            }

            if (!fs.existsSync(tempFilePath)) {
                throw new Error('Local file not found after download from Y2Mate');
            }

            // Lấy duration thật từ file vừa tải (Phòng trường hợp yt-dlp lỗi)
            if (duration === 0) {
                this.logger.log('📏 Getting duration from file using FFprobe...');
                duration = await this.getAudioDurationFromLocal(tempFilePath);
                this.logger.log(`📏 Duration extracted: ${duration}s`);
            }

            await notifyAllWaiting(80, 'Đang lưu trữ lên Cloudinary...');

            let finalAudioUrl = '';
            try {
                finalAudioUrl = await this.uploadToCloudinary(tempFilePath, videoId);
                this.logger.log(`☁️ Uploaded to Cloudinary: ${finalAudioUrl}`);
            } catch (uploadError) {
                this.logger.error(`❌ Upload Cloudinary failed: ${uploadError.message}`);
                throw uploadError;
            } finally {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                    this.logger.debug('🗑️ Cleaned up temp file');
                }
            }

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
                { youtubeVideoId: videoId, status: 'processing' },
                { status: 'failed' }
            );
            throw error;
        }
    }
}
