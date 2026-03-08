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
import * as os from 'os';
const youtubedl = require('youtube-dl-exec');
import { promisify } from 'util';
const pipeline = promisify(require('stream').pipeline);

@Processor('audio-convert', { concurrency: 2 })
@Injectable()
export class AudioConvertWorker extends WorkerHost {
    private readonly logger = new Logger(AudioConvertWorker.name);
    private proxies: string[] = [];

    constructor(
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        private configService: ConfigService,
        private readonly eventsGateway: EventsGateway,
    ) {
        super();
        this.logger.log('💿 Audio Convert Worker Initialized');

        const proxiesPath = path.join(process.cwd(), 'proxies.txt');
        if (fs.existsSync(proxiesPath)) {
            this.proxies = fs.readFileSync(proxiesPath, 'utf8')
                .split('\n')
                .map(p => p.trim())
                .filter(Boolean)
                .map(p => p.startsWith('http') ? p : `http://${p}`);
            this.logger.log(`🔄 Loaded ${this.proxies.length} proxies from proxies.txt`);
        }
    }

    private emitProgress(roomId: string, trackId: string, progress: number, message: string) {
        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:progress', {
            trackId,
            progress,
            message
        });
    }

    private async testProxy(proxyStr: string): Promise<boolean> {
        if (!proxyStr) return false;
        try {
            const urlParts = new URL(proxyStr);
            await axios.get('https://www.youtube.com', {
                proxy: {
                    protocol: urlParts.protocol,
                    host: urlParts.hostname,
                    port: Number(urlParts.port)
                },
                timeout: 3000
            });
            return true;
        } catch {
            return false;
        }
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { trackId, youtubeUrl, roomId, youtubeVideoId } = job.data;
        const videoId = youtubeVideoId;
        this.logger.log(`🔄 Processing job ${job.id} for video ${videoId} (yt-dlp Mode)`);

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
                    this.eventsGateway.emitToCoupleRoom(t.roomId.toString(), 'queue:progress', {
                        trackId: t._id.toString(),
                        progress: 100,
                        message: 'Hoàn thành!'
                    });
                }

                return { success: true, url: existing.audioUrl };
            }

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
            let workingProxy = '';

            // --- LỚP 1: YT-DLP (Primary) ---
            try {
                this.logger.log('🔗 Executing yt-dlp retry loop...');

                const ytOptions: any = {
                    dumpSingleJson: true,
                    noWarnings: true,
                    forceIpv4: true,
                    format: 'bestaudio[ext=m4a]/bestaudio',
                    extractorArgs: 'youtube:player_client=android,ios,web',
                    noPlaylist: true,
                    socketTimeout: 8000,
                };

                const proxies = [...this.proxies];
                if (proxies.length === 0) proxies.push('');

                let metadata: any = null;
                const maxRetries = Math.min(10, proxies.length || 1);

                for (let i = 0; i < maxRetries; i++) {
                    const proxy = proxies[Math.floor(Math.random() * proxies.length)];

                    if (proxy) {
                        this.logger.log(`🔍 Testing proxy: ${proxy}`);
                        const isWorking = await this.testProxy(proxy);
                        if (!isWorking) {
                            this.logger.log(`❌ Proxy test failed: ${proxy}, skipping...`);
                            continue;
                        }
                    }

                    try {
                        if (proxy) {
                            this.logger.log(`🌐 Trying yt-dlp with proxy: ${proxy}`);
                            ytOptions.proxy = proxy;
                        } else {
                            this.logger.log(`🌐 Trying without proxy`);
                            delete ytOptions.proxy;
                        }

                        metadata = await youtubedl(youtubeUrl, ytOptions);

                        if (metadata && metadata.url) {
                            this.logger.log(`✅ Proxy yt-dlp success: ${proxy || 'none'}`);
                            workingProxy = proxy;
                            streamUrl = metadata.url;
                            title = metadata.title;
                            duration = metadata.duration;
                            thumbnail = metadata.thumbnail;
                            success = true;
                            break;
                        }
                    } catch (err) {
                        this.logger.warn(`❌ Proxy yt-dlp failed: ${proxy || 'none'}`);
                    }
                }

                if (!success) {
                    throw new Error("All proxies failed or YouTube blocked the requests.");
                }
            } catch (e) {
                const errorMsg = e.message || '';
                this.logger.warn(`⚠️ yt-dlp extraction failed: ${errorMsg.split('\n')[0]}`);
            }

            // --- LỚP 2: FALLBACK TO BASIC STREAM (If layers fail) ---
            if (!success) {
                this.logger.log('🔗 Attempting basic fallback...');
                // You could add back Cobalt/Piped here if yt-dlp fails completely, 
                // but per user request we focus on backend handling with yt-dlp.
                throw new Error('Không thể lấy được link âm thanh từ YouTube. Vui lòng kiểm tra lại link hoặc file cookies.');
            }

            // 4. Download local via yt-dlp before uploading to Cloudinary
            await notifyAllWaiting(60, 'Đang tải audio về server...');
            let finalAudioUrl = streamUrl;
            let isStream = true;

            const tempFilePath = path.join(os.tmpdir(), `${videoId}.m4a`);

            try {
                const downloadOptions: any = {
                    extractAudio: true,
                    audioFormat: 'm4a',
                    output: tempFilePath,
                    format: 'bestaudio[ext=m4a]/bestaudio',
                    extractorArgs: 'youtube:player_client=android,ios,web',
                    noPlaylist: true,
                    socketTimeout: 8000,
                };

                if (workingProxy) {
                    downloadOptions.proxy = workingProxy;
                }

                this.logger.log(`📥 Downloading audio locally using working proxy...`);
                await youtubedl(youtubeUrl, downloadOptions);

                if (!fs.existsSync(tempFilePath)) {
                    throw new Error('Local file not found after download');
                }

                await notifyAllWaiting(80, 'Đang tải audio lên Cloudinary...');

                const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
                    resource_type: 'video',
                    folder: 'youtube_tracks',
                    public_id: videoId,
                    overwrite: true,
                    format: 'm4a',
                });

                finalAudioUrl = uploadResult.secure_url;
                isStream = false;
                this.logger.log(`☁️ Uploaded to Cloudinary: ${finalAudioUrl}`);

                fs.unlinkSync(tempFilePath);
            } catch (uploadError) {
                this.logger.error(`❌ Download/Upload failed: ${uploadError.message}. Falling back to stream URL.`);
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
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
