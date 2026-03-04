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
        this.logger.log(`🔄 Processing job ${job.id} for track ${trackId} (InnerTube + Cookies)`);

        try {
            // 1. Extract Video ID
            const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
            const match = youtubeUrl.match(regExp);
            const videoId = (match && match[7].length === 11) ? match[7] : null;

            if (!videoId) throw new Error('Invalid YouTube ID');

            this.emitProgress(roomId, trackId, 30, 'Đang chuẩn bị link stream...');

            const cookiesPath = path.join(process.cwd(), 'cookies.txt');
            const API_KEY = 'AIzaSyAO_FJ2Sl_rCrC_rCrC_rCrC_rCrC_rCrC';
            let streamUrl = '';
            let title = '';
            let duration = 0;
            let thumbnail = '';

            try {
                // TRY LAYER 1: InnerTube TV Client (Extremely stable, no PO_TOKEN needed)
                const response = await axios.post(`https://www.youtube.com/youtubei/v1/player?key=${API_KEY}`, {
                    videoId: videoId,
                    context: {
                        client: {
                            clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
                            clientVersion: '2.20230808.01.00',
                            hl: 'vi',
                            gl: 'VN'
                        }
                    }
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Origin': 'https://www.youtube.com',
                        'Referer': 'https://www.youtube.com/'
                    }
                });

                const data = response.data;
                const playability = data.playabilityStatus;

                if (playability?.status === 'OK' && data.streamingData?.adaptiveFormats) {
                    const audioFormat = data.streamingData.adaptiveFormats
                        .filter((f: any) => f.mimeType?.includes('audio') && f.url)
                        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

                    if (audioFormat?.url) {
                        streamUrl = audioFormat.url;
                        title = data.videoDetails?.title;
                        duration = parseInt(data.videoDetails?.lengthSeconds);
                        thumbnail = data.videoDetails?.thumbnail?.thumbnails?.[0]?.url;
                        this.logger.log(`🎯 Stream link fetched via InnerTube TV`);
                    }
                }
            } catch (e) {
                this.logger.warn(`⚠️ InnerTube TV failed, falling back to yt-dlp: ${e.message}`);
            }

            // LAYER 2: Optimized yt-dlp Fallback (Final reliability layer)
            if (!streamUrl) {
                this.emitProgress(roomId, trackId, 60, 'Đang vượt rào cản bypass...');
                const ytOptions: any = {
                    dumpSingleJson: true,
                    noWarnings: true,
                    forceIpv4: true,
                    format: 'bestaudio/best',
                    extractorArgs: ['youtube:player_client=android,web'],
                };
                if (fs.existsSync(cookiesPath)) ytOptions.cookies = cookiesPath;

                const metadata = await youtubedl(youtubeUrl, ytOptions);
                streamUrl = metadata.url;
                title = metadata.title;
                duration = metadata.duration;
                thumbnail = metadata.thumbnail;
                this.logger.log(`✅ Stream link fetched via yt-dlp fallback`);
            }

            if (!streamUrl) throw new Error('Could not extract stream URL');

            // 4. Update Database
            this.emitProgress(roomId, trackId, 90, 'Đang hoàn tất...');
            const expiredAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

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
            this.logger.log(`✅ Job ${job.id} completed successfully (Hybrid Mode)`);

            return { success: true, url: streamUrl };

        } catch (error) {
            this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);
            await this.trackModel.findByIdAndUpdate(trackId, { status: 'failed' });
            throw error;
        }
    }
}
