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
            // 1. Fetch Metadata and Stream URL (10-90%)
            this.emitProgress(roomId, trackId, 10, 'Đang lấy link phát nhạc...');
            const cookiesPath = path.join(process.cwd(), 'cookies.txt');
            const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

            const ytOptions: any = {
                dumpSingleJson: true,
                noWarnings: true,
                noCheckCertificates: true,
                preferFreeFormats: true,
                referer: 'https://www.youtube.com/',
                userAgent: chromeUserAgent,
                addHeader: [
                    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language: en-US,en;q=0.9',
                ],
                forceIpv4: true,
                extractorArgs: ['youtube:player_client=android'],
                noCacheDir: true,
                geoBypass: true,
            };
            if (fs.existsSync(cookiesPath)) {
                ytOptions.cookies = cookiesPath;
                this.logger.log('🍪 Using cookies.txt for authentication');
            }

            const metadata = await youtubedl(youtubeUrl, ytOptions);

            // Find best audio-only format
            let streamUrl = metadata.url;
            if (metadata.formats && metadata.formats.length > 0) {
                // Filter for audio only formats and sort by quality (abr)
                const audioFormats = metadata.formats.filter((f: any) =>
                    f.vcodec === 'none' && (f.acodec !== 'none' || f.audio_ext !== 'none') && f.url
                ).sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0));

                if (audioFormats.length > 0) {
                    streamUrl = audioFormats[0].url;
                }
            }

            if (!streamUrl) {
                throw new Error('Could not extract stream URL');
            }

            // 2. Update Database
            this.emitProgress(roomId, trackId, 95, 'Đang hoàn tất...');

            // Set expiration to 6 hours from now (YouTube standard)
            const expiredAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

            const updatedTrack = await this.trackModel.findByIdAndUpdate(trackId, {
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
                status: 'ready',
                audioUrl: streamUrl,
                isStreamUrl: true,
                expiredAt: expiredAt,
            }, { new: true });

            // 3. Finalize (100%)
            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'ready',
                trackId,
                status: 'ready',
                track: updatedTrack
            });

            this.emitProgress(roomId, trackId, 100, 'Hoàn thành!');

            this.logger.log(`✅ Job ${job.id} completed successfully (Stream URL extracted)`);
            return { success: true, url: streamUrl };

        } catch (error) {
            this.logger.error(`❌ Job ${job.id} failed:`, error);
            await this.trackModel.findByIdAndUpdate(trackId, { status: 'failed' });
            throw error;
        } finally {
            // Clean up Mp3 path if it exists (though we don't use it anymore)
            if (fs.existsSync(tempMp3Path)) {
                fs.unlinkSync(tempMp3Path);
            }
        }
    }
}
