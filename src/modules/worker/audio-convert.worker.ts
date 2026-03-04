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
        const { trackId, youtubeUrl, roomId } = job.data;
        this.logger.log(`🔄 Processing job ${job.id} for track ${trackId} (Piped API Mode)`);

        try {
            // 1. Extract Video ID
            const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
            const match = youtubeUrl.match(regExp);
            const videoId = (match && match[7].length === 11) ? match[7] : null;

            if (!videoId) throw new Error('Invalid YouTube ID');

            this.emitProgress(roomId, trackId, 30, 'Đang giải mã luồng âm thanh...');

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
                    isAudioOnly: true,
                    aFormat: 'mp3'
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
                    { url: 'https://inv.tux.pizza', type: 'invidious' },
                    { url: 'https://invidious.projectsegfau.lt', type: 'invidious' }
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

            // --- LỚP 3: YT-DLP FALLBACK ---
            if (!success) {
                try {
                    this.logger.log('🔗 Falling back to yt-dlp...');
                    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
                    const ytOptions: any = {
                        dumpSingleJson: true,
                        noWarnings: true,
                        forceIpv4: true,
                        format: 'bestaudio/best',
                    };
                    if (fs.existsSync(cookiesPath)) ytOptions.cookies = cookiesPath;

                    const metadata = await youtubedl(youtubeUrl, ytOptions);
                    streamUrl = metadata.url;
                    title = metadata.title;
                    duration = metadata.duration;
                    thumbnail = metadata.thumbnail;
                    success = true;
                    this.logger.log('🎯 Success via yt-dlp fallback');
                } catch (e) {
                    this.logger.error(`❌ All layers failed: ${e.message}`);
                }
            }

            if (!success || !streamUrl) {
                throw new Error('All Cloud Gateways (Piped/Invidious) failed. Please try again later.');
            }

            // 4. Update Database
            this.emitProgress(roomId, trackId, 80, 'Đang hoàn tất lưu trữ...');
            const expiredAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours

            const updatedTrack = await this.trackModel.findByIdAndUpdate(trackId, {
                title: title,
                thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: duration,
                status: 'ready',
                audioUrl: streamUrl,
                isStreamUrl: true,
                expiredAt: expiredAt,
            }, { new: true });

            // 5. Finalize
            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'ready',
                trackId,
                status: 'ready',
                track: updatedTrack
            });

            this.emitProgress(roomId, trackId, 100, 'Hoàn thành!');
            this.logger.log(`✅ Job ${job.id} completed successfully (Cloud Gateway Mode)`);

            return { success: true, url: streamUrl };

        } catch (error) {
            this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);
            await this.trackModel.findByIdAndUpdate(trackId, { status: 'failed' });
            throw error;
        }
    }
}
