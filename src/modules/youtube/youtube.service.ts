import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class YoutubeService implements OnModuleInit, OnModuleDestroy {
    private redis: Redis;
    private readonly logger = new Logger(YoutubeService.name);

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const redisUrl = this.configService.get<string>('REDIS_URL');
        const redisOptions = {
            maxRetriesPerRequest: 1,
            connectTimeout: 2000,
            retryStrategy: (times: number) => {
                if (times > 3) {
                    this.logger.warn('Redis reconnection stopped after 3 attempts.');
                    return null; // Stop retrying
                }
                return 5000; // Retry after 5s
            },
            enableOfflineQueue: false, // Fail immediately if not connected
        };

        if (redisUrl) {
            this.redis = new Redis(redisUrl, redisOptions);
        } else {
            this.redis = new Redis({
                host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
                port: this.configService.get<number>('REDIS_PORT', 6379),
                family: 4,
                ...redisOptions,
            });
        }

        this.redis.on('error', (err) => {
            // Log once, then ioredis will stop due to retryStrategy returning null
            this.logger.warn(`Redis connection error: ${err.message}`);
        });
    }

    onModuleDestroy() {
        if (this.redis) {
            this.redis.disconnect();
        }
    }

    private async getDynamicAuth() {
        try {
            const res = await axios.get('https://v1.y2mate.nu/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
                }
            });
            const html = res.data;
            const match = html.match(/var json = JSON\.parse\('([^']+)'\)/);
            if (!match) throw new Error("Could not find auth config in HTML");

            const json = JSON.parse(match[1]);
            const data = json[0];
            const mask = json[2];
            const reverse = json[1];
            const paramNameCode = json[6];

            let e = "";
            for (let t = 0; t < data.length; t++) {
                e += String.fromCharCode(data[t] - mask[mask.length - (t + 1)]);
            }

            if (reverse) {
                e = e.split("").reverse().join("");
            }

            const token = e.length > 32 ? e.substring(0, 32) : e;
            const paramName = String.fromCharCode(paramNameCode);

            this.logger.log(`Dynamic Auth extracted: ${paramName}=${token}`);
            return { paramName, token };
        } catch (error) {
            this.logger.error(`Failed to get dynamic auth: ${error.message}`);
            // Fallback to 'j' and a random string if fetching fails, though likely to 403
            return { paramName: 'j', token: 'fLhwVKi3ogiJF7YEUL81klZNuomhJktU' };
        }
    }

    async convertToMp3(videoId: string, skipCache: boolean = false) {
        const cacheKey = `yt:mp3:${videoId}`;

        if (!skipCache) {
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (e) {
                this.logger.error(`Redis error: ${e.message}`);
            }
        }

        const t = Math.floor(Date.now() / 1000);
        const { paramName, token } = await this.getDynamicAuth();

        const headers = {
            'accept': '*/*',
            'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'origin': 'https://v1.y2mate.nu',
            'referer': 'https://v1.y2mate.nu/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        };

        try {
            // STEP 1: Init
            this.logger.log(`[Step 1] Initializing conversion for ${videoId}...`);
            const initRes = await axios.get('https://eta.etacloud.org/api/v1/init', {
                params: {
                    [paramName]: token,
                    t: t,
                },
                headers,
            });

            if (initRes.data.error !== 0 && initRes.data.error !== "0") {
                this.logger.error(`[Step 1] Init failed: ${JSON.stringify(initRes.data)}`);
                throw new Error(`Init failed: ${initRes.data.error}`);
            }

            const convertURL = initRes.data.convertURL;
            this.logger.log(`[Step 1] Success. ConvertURL: ${convertURL}`);

            // STEP 2: Convert
            this.logger.log('[Step 2] Sending conversion request...');
            const convertFullUrl = `${convertURL}&v=${videoId}&f=mp3&t=${t}`;
            let convertRes = await axios.get(convertFullUrl, { headers });
            this.logger.log(`[Step 2] Response: ${JSON.stringify(convertRes.data)}`);

            // STEP 3: Follow redirect
            if (convertRes.data.redirect === 1 || convertRes.data.redirect === "1") {
                const redirectURL = convertRes.data.redirectURL;
                this.logger.log(`[Step 3] Following redirect to: ${redirectURL}`);
                const redirectFullUrl = `${redirectURL}&v=${videoId}&f=mp3&t=${t}`;
                convertRes = await axios.get(redirectFullUrl, { headers });
                this.logger.log(`[Step 3] Final Response: ${JSON.stringify(convertRes.data)}`);
            }

            const data = convertRes.data;
            if (!data.downloadURL) {
                if (data.error !== 0 && data.error !== "0") {
                    if (data.error === 215) throw new Error('Video đang được xử lý hoặc không hợp lệ. Vui lòng thử lại sau.');
                    throw new Error(`Convert error code: ${data.error}`);
                }
                throw new Error('Không tìm thấy link tải trong phản hồi từ server.');
            }

            const result = {
                title: data.title,
                downloadURL: data.downloadURL, // Đồng bộ tên biến downloadURL
                provider: 'y2mate',
            };

            // Cache kết quả convert trong 10 phút
            try {
                await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
            } catch (e) { }

            return result;
        } catch (error) {
            this.logger.error(
                `Error converting ${videoId}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message
                }`,
            );
            throw error;
        }
    }
}
