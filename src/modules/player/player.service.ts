import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { Track, TrackDocument } from '../tracks/schemas/track.schema';
import { EventsGateway } from '../events/events.gateway';
import { PlayTrackDto } from './dto/play-track.dto';
import { SeekDto } from './dto/seek.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TimerDto } from './dto/timer.dto';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PlayerService {
    private readonly logger = new Logger(PlayerService.name);

    constructor(
        @InjectModel(CoupleRoom.name) private roomModel: Model<CoupleRoomDocument>,
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        private readonly eventsGateway: EventsGateway,
        @InjectQueue('audio-convert') private audioQueue: Queue,
    ) { }

    async getPlayerState(roomId: string) {
        const room = await this.roomModel.findById(roomId).populate('currentTrackId');
        if (!room) {
            throw new NotFoundException('Room not found');
        }

        let currentTime = room.currentTime || 0;
        if (room.isPlaying && room.startedAt) {
            currentTime = currentTime + (Date.now() - new Date(room.startedAt).getTime()) / 1000;
        }

        const queue = await this.trackModel.find({
            roomId: new Types.ObjectId(roomId),
            status: { $in: ['ready', 'processing'] },
        })
            .sort({ createdAt: 1 })
            .select('title thumbnail duration audioUrl status');

        // Cast populated field back
        let currentTrack = room.currentTrackId as any;

        // Auto-refresh expired stream URLs
        if (currentTrack && currentTrack.isStreamUrl && currentTrack.expiredAt && new Date(currentTrack.expiredAt) < new Date()) {
            this.logger.log(`🔄 Stream URL expired for track ${currentTrack._id}, refreshing...`);
            await this.trackModel.findByIdAndUpdate(currentTrack._id, { status: 'processing' });
            await this.audioQueue.add('audio-convert', {
                trackId: currentTrack._id,
                youtubeUrl: `https://www.youtube.com/watch?v=${currentTrack.youtubeVideoId}`,
                roomId: roomId
            });
            // Update local object to reflect processing status
            currentTrack.status = 'processing';
        }

        return {
            currentTrack: currentTrack ? {
                _id: currentTrack._id,
                title: currentTrack.title,
                thumbnail: currentTrack.thumbnail,
                audioUrl: currentTrack.audioUrl,
                duration: currentTrack.duration,
                status: currentTrack.status,
            } : null,
            isPlaying: room.isPlaying,
            currentTime,
            queue,
            timerEndsAt: room.timerEndsAt,
        };
    }

    async getQueue(roomId: string) {
        const queue = await this.trackModel.find({
            roomId: new Types.ObjectId(roomId),
            status: { $in: ['ready', 'processing'] },
        })
            .sort({ createdAt: 1 })
            .select('title thumbnail duration status');

        return queue;
    }

    async play(roomId: string, playDto: PlayTrackDto, requestUserId?: string) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        const trackId = playDto.trackId;
        const track = await this.trackModel.findById(trackId);
        if (!track || track.roomId.toString() !== roomId || track.status !== 'ready') {
            throw new BadRequestException('Track is invalid, not in this room, or not ready');
        }

        // Logic xử lý thời gian bắt đầu (startTime)
        let startTime = 0;
        if (playDto.startTime !== undefined) {
            // Ưu tiên 1: Lấy từ body request nếu mobile gửi lên
            startTime = playDto.startTime;
        } else if (room.currentTrackId?.toString() === trackId) {
            // Ưu tiên 2: Nếu là phát lại đúng bài cũ đang dở, giữ nguyên currentTime hiện tại
            startTime = room.currentTime || 0;
        }

        room.currentTrackId = new Types.ObjectId(trackId);
        room.isPlaying = true;
        room.startedAt = new Date();
        room.currentTime = startTime;
        await room.save();

        this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
            type: 'play',
            currentTrackId: trackId,
            isPlaying: true,
            currentTime: startTime,
        });

        return { success: true };
    }

    async pause(roomId: string, requestUserId?: string) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        if (room.isPlaying) {
            let currentTime = room.currentTime || 0;
            if (room.startedAt) {
                currentTime = currentTime + (Date.now() - new Date(room.startedAt).getTime()) / 1000;
            }
            room.isPlaying = false;
            room.currentTime = currentTime;
            await room.save();

            this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
                type: 'pause',
                currentTrackId: room.currentTrackId,
                isPlaying: false,
                currentTime: room.currentTime,
            });
        }

        return { success: true };
    }

    async seek(roomId: string, seekDto: SeekDto, requestUserId?: string) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        room.startedAt = new Date();
        room.currentTime = seekDto.time;
        await room.save();

        this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
            type: 'seek',
            currentTrackId: room.currentTrackId,
            isPlaying: room.isPlaying,
            currentTime: seekDto.time,
        });

        return { success: true };
    }

    async next(roomId: string, requestUserId?: string) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        // Find the next track
        const currentTrackId = room.currentTrackId;
        let query: any = {
            roomId: new Types.ObjectId(roomId),
            status: 'ready',
        };

        if (currentTrackId) {
            const currentTrack = await this.trackModel.findById(currentTrackId);
            if (currentTrack) {
                query.createdAt = { $gt: (currentTrack as any).createdAt };
            }
        }

        let nextTrack = await this.trackModel.findOne(query).sort({ createdAt: 1 });

        // If there is no next track, loops back to the first track in queue
        if (!nextTrack) {
            nextTrack = await this.trackModel.findOne({
                roomId: new Types.ObjectId(roomId),
                status: 'ready',
            }).sort({ createdAt: 1 });
        }

        if (!nextTrack) {
            throw new BadRequestException('Queue is empty');
        }

        room.currentTrackId = nextTrack._id as Types.ObjectId;
        room.isPlaying = true;
        room.startedAt = new Date();
        room.currentTime = 0;
        await room.save();

        this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
            type: 'next',
            currentTrackId: nextTrack._id,
            isPlaying: true,
            currentTime: 0,
        });

        return { success: true, trackId: nextTrack._id };
    }

    async previous(roomId: string, requestUserId?: string) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        // Find the previous track based on createdAt
        const currentTrackId = room.currentTrackId;
        let query: any = {
            roomId: new Types.ObjectId(roomId),
            status: 'ready',
        };

        if (currentTrackId) {
            const currentTrack = await this.trackModel.findById(currentTrackId);
            if (currentTrack) {
                query.createdAt = { $lt: (currentTrack as any).createdAt };
            }
        }

        // Find immediate previous track (last one before current)
        let prevTrack = await this.trackModel.findOne(query).sort({ createdAt: -1 });

        // If no previous track, loop back to the *last* track in queue
        if (!prevTrack) {
            prevTrack = await this.trackModel.findOne({
                roomId: new Types.ObjectId(roomId),
                status: 'ready',
            }).sort({ createdAt: -1 });
        }

        if (!prevTrack) {
            throw new BadRequestException('Queue is empty');
        }

        room.currentTrackId = prevTrack._id as Types.ObjectId;
        room.isPlaying = true;
        room.startedAt = new Date();
        room.currentTime = 0;
        await room.save();

        this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
            type: 'previous',
            currentTrackId: prevTrack._id,
            isPlaying: true,
            currentTime: 0,
        });

        return { success: true, trackId: prevTrack._id };
    }

    async setTimer(roomId: string, timerDto: TimerDto) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        let timerEndsAt: Date | null = null;
        if (timerDto.minutes > 0) {
            timerEndsAt = new Date(Date.now() + timerDto.minutes * 60000);
        }

        room.timerEndsAt = timerEndsAt;
        await room.save();

        this.eventsGateway.emitToCoupleRoom(roomId, 'player:timer-update', {
            timerEndsAt: timerEndsAt,
        });

        return { success: true, timerEndsAt };
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleSleepTimer() {
        const now = new Date();
        const roomsToStop = await this.roomModel.find({
            isPlaying: true,
            timerEndsAt: { $ne: null, $lte: now }
        });

        for (const room of roomsToStop) {
            this.logger.log(`😴 Sleep timer reached for room ${room._id}, pausing...`);

            let currentTime = room.currentTime || 0;
            if (room.startedAt) {
                currentTime = currentTime + (Date.now() - new Date(room.startedAt).getTime()) / 1000;
            }

            room.isPlaying = false;
            room.currentTime = currentTime;
            room.timerEndsAt = null; // Clear timer
            await room.save();

            this.eventsGateway.emitToCoupleRoom(room._id.toString(), 'player:update', {
                type: 'pause',
                currentTrackId: room.currentTrackId,
                isPlaying: false,
                currentTime: room.currentTime,
            });

            this.eventsGateway.emitToCoupleRoom(room._id.toString(), 'player:timer-update', {
                timerEndsAt: null,
            });
        }
    }
}
