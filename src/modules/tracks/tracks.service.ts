import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Track, TrackDocument } from './schemas/track.schema';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { AddTrackDto } from './dto/add-track.dto';
const youtubedl = require('youtube-dl-exec');
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TracksService {
    constructor(
        @InjectModel(Track.name) private trackModel: Model<TrackDocument>,
        @InjectModel(CoupleRoom.name) private roomModel: Model<CoupleRoomDocument>,
        @InjectQueue('audio-convert') private audioQueue: Queue,
        private configService: ConfigService,
        private readonly eventsGateway: EventsGateway,
    ) {
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    async addTrackToRoom(roomId: string, userId: string, addTrackDto: AddTrackDto) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new NotFoundException('Room not found');
        }

        // Validate if user belongs to the room (Assuming partners array contains user IDs as strings)
        if (!room.partners.includes(userId)) {
            throw new BadRequestException('User does not belong to this room');
        }

        let metadata;
        try {
            metadata = await youtubedl(addTrackDto.youtubeUrl, { dumpJson: true, noWarnings: true });
        } catch (error) {
            console.error('YouTube Fetch Error:', error);
            throw new BadRequestException('Invalid YouTube URL or cannot fetch metadata');
        }

        if (metadata.duration > 360) {
            throw new BadRequestException('Video duration must be 360 seconds or less');
        }

        const newTrack = new this.trackModel({
            roomId: new Types.ObjectId(roomId),
            youtubeVideoId: metadata.id,
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            duration: metadata.duration,
            status: 'processing',
            addedBy: new Types.ObjectId(userId),
        });

        const savedTrack = await newTrack.save();

        await this.audioQueue.add('convert', {
            trackId: savedTrack._id.toString(),
            youtubeUrl: addTrackDto.youtubeUrl,
            roomId: roomId,
        });

        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
            type: 'added',
            trackId: savedTrack._id.toString(),
            status: 'processing',
            track: {
                _id: savedTrack._id,
                title: savedTrack.title,
                thumbnail: savedTrack.thumbnail,
                duration: savedTrack.duration,
                status: 'processing'
            }
        });

        return {
            trackId: savedTrack._id,
            status: savedTrack.status,
            title: savedTrack.title,
            thumbnail: savedTrack.thumbnail,
            duration: savedTrack.duration,
        };
    }

    async removeTrackFromRoom(roomId: string, userId: string, trackId: string) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        const track = await this.trackModel.findById(trackId);
        if (!track || track.roomId.toString() !== roomId) {
            throw new NotFoundException('Track not found in this room');
        }

        // Only the user who added it or room partners can delete it
        if (track.addedBy.toString() !== userId && !room.partners.includes(userId)) {
            throw new ForbiddenException('You do not have permission to delete this track');
        }

        // 1. Delete from DB
        await this.trackModel.findByIdAndDelete(trackId);

        // 2. Delete cloud file if it exists
        if (track.status === 'ready' && track.audioUrl) {
            try {
                await cloudinary.uploader.destroy(`rooms/${roomId}/track_${trackId}`, { resource_type: 'video' });
            } catch (e) { }
        }

        // 3. Emit update & skip track logic 
        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
            trackId: trackId,
            status: 'deleted',
        });

        if (room.currentTrackId?.toString() === trackId) {
            room.currentTrackId = null as any;
            room.isPlaying = false;
            room.currentTime = 0;
            room.startedAt = null as any;
            await room.save();
            this.eventsGateway.emitToCoupleRoom(roomId, 'player:update', {
                type: 'pause',
                currentTrackId: null,
                isPlaying: false,
                currentTime: 0,
            });
        }

        return { success: true };
    }
}
