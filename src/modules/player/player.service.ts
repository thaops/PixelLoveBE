import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { Track, TrackDocument } from '../tracks/schemas/track.schema';
import { EventsGateway } from '../events/events.gateway';
import { PlayTrackDto } from './dto/play-track.dto';
import { SeekDto } from './dto/seek.dto';

@Injectable()
export class PlayerService {
    constructor(
        @InjectModel(CoupleRoom.name) private roomModel: Model<CoupleRoomDocument>,
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        private readonly eventsGateway: EventsGateway,
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
            status: 'ready',
        })
            .sort({ createdAt: 1 })
            .select('title thumbnail duration audioUrl status');

        // Cast populated field back
        const currentTrack = room.currentTrackId as any;

        return {
            currentTrack: currentTrack ? {
                _id: currentTrack._id,
                title: currentTrack.title,
                thumbnail: currentTrack.thumbnail,
                audioUrl: currentTrack.audioUrl,
                duration: currentTrack.duration,
            } : null,
            isPlaying: room.isPlaying,
            currentTime,
            queue,
        };
    }

    async getQueue(roomId: string) {
        const queue = await this.trackModel.find({
            roomId: new Types.ObjectId(roomId),
            status: 'ready',
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

        room.currentTrackId = new Types.ObjectId(trackId);
        room.isPlaying = true;
        room.startedAt = new Date();
        room.currentTime = 0;
        await room.save();

        this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
            type: 'play',
            currentTrackId: trackId,
            isPlaying: true,
            currentTime: 0,
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
}
