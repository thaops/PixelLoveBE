// @ts-ignore
import { Processor, WorkerHost } from '@nestjs/bullmq';
// @ts-ignore
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Track, TrackDocument } from '../tracks/schemas/track.schema';
import * as path from 'path';
import * as fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { EventsGateway } from '../events/events.gateway';
// Fix import for untyped modules to prevent TS2307 on Render
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const ffmpeg = require('fluent-ffmpeg');
const youtubedl = require('youtube-dl-exec');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

@Processor('audio-convert')
@Injectable()
export class AudioConvertWorker extends WorkerHost {
    private readonly logger = new Logger(AudioConvertWorker.name);

    constructor(
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        private configService: ConfigService,
        private readonly eventsGateway: EventsGateway,
    ) {
        super();
        this.logger.log('💿 Audio Convert Worker Initialized');

        // Configure Cloudinary explicitly in the worker thread
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });

        // Ensure temp directory exists
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    }

    private emitProgress(roomId: string, trackId: string, progress: number, message: string) {
        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:progress', {
            trackId,
            progress,
            message
        });
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { trackId, youtubeUrl, roomId } = job.data;
        this.logger.log(`🔄 Processing job ${job.id} for track ${trackId}`);

        const tempMp3Path = path.join(process.cwd(), 'temp', `${trackId}.mp3`);

        try {
            // 1. Fetch Metadata (10%)
            this.emitProgress(roomId, trackId, 10, 'Đang quét link YouTube...');
            const metadata = await youtubedl(youtubeUrl, {
                dumpJson: true,
                noWarnings: true,
                noCheckCertificates: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
                referer: 'https://www.youtube.com/'
            });

            // 2. Download and convert (20-70%)
            this.emitProgress(roomId, trackId, 30, 'Đang tải nhạc và chuyển đổi...');
            if (fs.existsSync(tempMp3Path)) {
                fs.unlinkSync(tempMp3Path);
            }

            await youtubedl(youtubeUrl, {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0,
                output: tempMp3Path,
                noWarnings: true,
                noPlaylist: true,
                ffmpegLocation: ffmpegInstaller.path,
            });

            // 3. Upload to Cloudinary (80-95%)
            this.emitProgress(roomId, trackId, 85, 'Đang đồng bộ lên đám mây...');
            const uploadResult = await cloudinary.uploader.upload(tempMp3Path, {
                resource_type: 'video',
                folder: `rooms/${roomId}`,
                public_id: `track_${trackId}`,
            });

            // 4. Update Database
            this.emitProgress(roomId, trackId, 95, 'Đang hoàn tất...');
            const updatedTrack = await this.trackModel.findByIdAndUpdate(trackId, {
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
                status: 'ready',
                audioUrl: uploadResult.secure_url,
            }, { new: true });

            // 5. Finalize (100%)
            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'ready',
                trackId,
                status: 'ready',
                track: updatedTrack
            });

            this.emitProgress(roomId, trackId, 100, 'Hoàn thành!');

            this.logger.log(`✅ Job ${job.id} completed successfully`);
            return { success: true, url: uploadResult.secure_url };

        } catch (error) {
            this.logger.error(`❌ Job ${job.id} failed:`, error);

            // Mark as failed in DB
            await this.trackModel.findByIdAndUpdate(trackId, {
                status: 'failed',
            });
            throw error;

        } finally {
            // 4. Cleanup temp files
            this.logger.log(`[Job ${job.id}] Cleaning up temp files...`);
            if (fs.existsSync(tempMp3Path)) {
                fs.unlinkSync(tempMp3Path);
            }
        }
    }
}
