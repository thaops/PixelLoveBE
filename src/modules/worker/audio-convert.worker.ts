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
        this.logger.log(`🔄 Processing job ${job.id} for video ${videoId} (Piped API Mode)`);

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

            // 1. Extract Video ID (already provided but fallback just in case)
            if (!videoId) {
                const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
                const match = youtubeUrl.match(regExp);
                const extractedId = (match && match[7].length === 11) ? match[7] : null;
                if (!extractedId) throw new Error('Invalid YouTube ID');
            }

            await notifyAllWaiting(30, 'Đang giải mã luồng âm thanh...');

            let streamUrl = '';
            let title = '';
            let duration = 0;
            let thumbnail = '';
            let success = false;

            const axiosConfig = {
                timeout: 8000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            // --- LỚP 1: COBALT API ---
            try {
                this.logger.log(`🔗 Trying Cobalt API...`);
                const cobaltResponse = await axios.post('https://api.cobalt.tools/api/json', {
                    url: youtubeUrl,
                    downloadMode: 'audio',
                    audioFormat: 'mp3'
                }, axiosConfig);

                if (cobaltResponse.data?.url) {
                    streamUrl = cobaltResponse.data.url;
                    success = true;
                    this.logger.log('🎯 Success via Cobalt API');
                }
            } catch (e) {
                this.logger.warn(`⚠️ Cobalt API failed: ${e.message}`);
            }

            // --- LỚP 2: CLOUD GATEWAYS (Piped/Invidious) ---
            if (!success) {
                const gateways = [
                    { url: 'https://pipedapi.kavin.rocks', type: 'piped' },
                    { url: 'https://pa.il.ax', type: 'piped' },
                    { url: 'https://pipedapi.rivo.lol', type: 'piped' },
                    { url: 'https://piped-api.lunar.icu', type: 'piped' },
                    { url: 'https://inv.tux.pizza', type: 'invidious' },
                    { url: 'https://invidious.projectsegfau.lt', type: 'invidious' },
                    { url: 'https://invidious.no-logs.com', type: 'invidious' }
                ];

                for (const gateway of gateways) {
                    try {
                        this.logger.log(`🔗 Trying ${gateway.type}: ${gateway.url}`);
                        if (gateway.type === 'piped') {
                            const res = await axios.get(`${gateway.url}/streams/${videoId}`, axiosConfig);
                            if (res.data?.audioStreams?.length > 0) {
                                streamUrl = res.data.audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0].url;
                                title = res.data.title;
                                duration = res.data.duration;
                                thumbnail = res.data.thumbnailUrl;
                                success = true;
                            }
                        } else {
                            const res = await axios.get(`${gateway.url}/api/v1/videos/${videoId}`, axiosConfig);
                            if (res.data?.adaptiveFormats?.length > 0) {
                                streamUrl = res.data.adaptiveFormats.filter((f: any) => f.type?.includes('audio'))[0].url;
                                title = res.data.title;
                                duration = res.data.lengthSeconds;
                                success = true;
                            }
                        }
                        if (success) break;
                    } catch (e) {
                        this.logger.warn(`⚠️ Gateway ${gateway.url} failed: ${e.message}`);
                    }
                }
            }

            // --- LỚP 3: YT-DLP FALLBACK (Bypass Mode) ---
            if (!success) {
                try {
                    this.logger.log('🔗 Falling back to yt-dlp (Bypass Mode)...');
                    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
                    const ytOptions: any = {
                        dumpSingleJson: true,
                        noWarnings: true,
                        forceIpv4: true,
                        format: 'bestaudio/best',
                        extractorArgs: 'youtube:player_client=android,web',
                        addHeader: ['Accept-Language: en-US,en;q=0.9']
                    };
                    if (fs.existsSync(cookiesPath)) ytOptions.cookies = cookiesPath;

                    const metadata = await youtubedl(youtubeUrl, ytOptions);
                    streamUrl = metadata.url;
                    title = metadata.title;
                    duration = metadata.duration;
                    thumbnail = metadata.thumbnail;
                    success = true;
                    this.logger.log('🎯 Success via yt-dlp bypass fallback');
                } catch (e) {
                    this.logger.error(`❌ All layers failed: ${e.message}`);
                }
            }

            if (!success || !streamUrl) {
                throw new Error('All Cloud Gateways (Piped/Invidious) failed. Please try again later.');
            }

            // 4. Permanent Storage: Upload to Cloudinary
            await notifyAllWaiting(85, 'Đang chuẩn bị lưu trữ vĩnh viễn...');
            let finalAudioUrl = streamUrl;
            let isStream = true;

            try {
                // We use Cloudinary's capability to upload from a URL directly.
                // This is more efficient than downloading to our server and then uploading.
                // Cloudinary also automatically handles conversion/optimization.
                const uploadResult = await cloudinary.uploader.upload(streamUrl, {
                    resource_type: 'video',
                    folder: 'youtube_tracks',
                    public_id: videoId,
                    overwrite: true,
                    format: 'mp3',
                });

                finalAudioUrl = uploadResult.secure_url;
                isStream = false;
                this.logger.log(`☁️ Uploaded to Cloudinary: ${finalAudioUrl}`);
            } catch (uploadError) {
                this.logger.error(`❌ Cloudinary upload failed: ${uploadError.message}. Falling back to stream URL.`);
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
