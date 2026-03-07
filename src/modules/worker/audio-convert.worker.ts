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
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
const youtubedl = require('youtube-dl-exec');
import { promisify } from 'util';
const pipeline = promisify(require('stream').pipeline);

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
    }

    private parseCookies(cookiesPath: string): string {
        if (!fs.existsSync(cookiesPath)) return '';
        try {
            const content = fs.readFileSync(cookiesPath, 'utf8');
            const lines = content.split('\n');
            const cookiePairs: string[] = [];
            for (const line of lines) {
                if (!line || line.startsWith('#') || line.trim() === '') continue;
                const parts = line.split('\t');
                if (parts.length >= 7) {
                    cookiePairs.push(`${parts[5].trim()}=${parts[6].trim()}`);
                }
            }
            return cookiePairs.join('; ');
        } catch (e) {
            this.logger.error('Error parsing cookies:', e);
            return '';
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
        const { trackId, youtubeUrl, roomId, youtubeVideoId } = job.data;
        const videoId = youtubeVideoId;
        this.logger.log(`🔄 Processing job ${job.id} for video ${videoId} (yt-dlp Mode)`);

        try {
            // Helper to notify all waiting rooms
            const notifyAllWaiting = async (progress: number, message: string) => {
                const tracks = await this.trackModel.find({ youtubeVideoId: videoId, status: 'processing' });
                for (const t of tracks) {
                    this.eventsGateway.emitToCoupleRoom(t.roomId.toString(), 'queue:progress', {
                        trackId: t._id.toString(),
                        progress,
                        message
                    });
                }
            };

            await notifyAllWaiting(10, 'Đang trích xuất link âm thanh...');

            let streamUrl = '';
            let title = '';
            let duration = 0;
            let thumbnail = '';
            let success = false;

            // --- LỚP 1: YT-DLP WITH COOKIES (Primary) ---
            try {
                this.logger.log('🔗 Executing yt-dlp with cookies...');
                const cookiesPath = path.join(process.cwd(), 'cookies.txt');

                // Configuration for yt-dlp on Windows to find its own JS runtime (Node)
                // This is critical for solving YouTube's signature challenges when using cookies
                const ytOptions: any = {
                    dumpSingleJson: true,
                    noWarnings: true,
                    forceIpv4: true,
                    format: 'bestaudio',
                    // Use web client as it matches most cookies.txt exports
                    extractorArgs: 'youtube:player_client=web',
                    noPlaylist: true,
                };

                if (fs.existsSync(cookiesPath)) {
                    ytOptions.cookies = cookiesPath;
                } else {
                    this.logger.warn('⚠️ cookies.txt not found, attempting without it');
                }

                // Inject PATH to ensure node.exe is found for signature solving
                const nodePath = 'C:\\nvm4w\\nodejs';
                const originalPath = process.env.PATH || '';
                if (!originalPath.includes(nodePath)) {
                    process.env.PATH = `${nodePath};${originalPath}`;
                }

                const metadata = await youtubedl(youtubeUrl, ytOptions);

                if (metadata && metadata.url) {
                    streamUrl = metadata.url;
                    title = metadata.title;
                    duration = metadata.duration;
                    thumbnail = metadata.thumbnail;
                    success = true;
                    this.logger.log('🎯 Success via yt-dlp with cookies');
                }
            } catch (e) {
                this.logger.warn(`⚠️ yt-dlp layer failed: ${e.message}`);
                // Fallback to basic extraction if cookies fail or metadata is partial
            }

            // --- LỚP 2: FALLBACK TO BASIC STREAM (If layers fail) ---
            if (!success) {
                this.logger.log('🔗 Attempting basic fallback...');
                // You could add back Cobalt/Piped here if yt-dlp fails completely, 
                // but per user request we focus on backend handling with yt-dlp.
                throw new Error('Không thể lấy được link âm thanh từ YouTube. Vui lòng kiểm tra lại link hoặc file cookies.');
            }

            // 4. Permanent Storage: Upload to Cloudinary
            await notifyAllWaiting(60, 'Đang tối ưu và lưu trữ audio (m4a)...');
            let finalAudioUrl = streamUrl;
            let isStream = true;

            try {
                // Cloudinary handles transcoding to m4a/mp3 and provides permanent storage
                const uploadResult = await cloudinary.uploader.upload(streamUrl, {
                    resource_type: 'video',
                    folder: 'youtube_tracks',
                    public_id: videoId,
                    overwrite: true,
                    // m4a is requested for better mobile compatibility and smaller size
                    format: 'm4a',
                });

                finalAudioUrl = uploadResult.secure_url;
                isStream = false;
                this.logger.log(`☁️ Uploaded to Cloudinary: ${finalAudioUrl}`);
            } catch (uploadError) {
                this.logger.error(`❌ Cloudinary upload failed: ${uploadError.message}. Falling back to stream URL.`);
                // If cloudinary fails, we still have the stream URL as fallback
            }

            // 5. Update Database for ALL processing tracks with this youtubeVideoId
            const updatedResult = await this.trackModel.updateMany(
                { youtubeVideoId: videoId, status: 'processing' },
                {
                    title: title || 'YouTube Track',
                    thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration: duration,
                    status: 'ready',
                    audioUrl: finalAudioUrl,
                    isStreamUrl: isStream,
                    expiredAt: isStream ? new Date(Date.now() + 5 * 60 * 60 * 1000) : null,
                }
            );

            this.logger.log(`✅ Updated ${updatedResult.modifiedCount} tracks to READY status`);

            // 6. Notify all affected rooms
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
                this.eventsGateway.emitToCoupleRoom(t.roomId.toString(), 'queue:progress', {
                    trackId: t._id.toString(),
                    progress: 100,
                    message: 'Hoàn thành!'
                });
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
