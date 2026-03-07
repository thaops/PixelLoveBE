import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Track, TrackDocument } from './schemas/track.schema';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { AddTrackDto } from './dto/add-track.dto';
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

    async checkTrackByUrl(roomId: string, userId: string, youtubeUrl: string) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = youtubeUrl.match(regExp);
        const youtubeVideoId = (match && match[7].length === 11) ? match[7] : null;

        if (!youtubeVideoId) throw new BadRequestException('URL YouTube không hợp lệ');

        const existingTrack = await this.trackModel.findOne({ youtubeVideoId, status: 'ready' });
        if (existingTrack) {
            // Tự động add vào room luôn
            const newTrack = new this.trackModel({
                roomId: new Types.ObjectId(roomId),
                youtubeVideoId,
                title: existingTrack.title,
                thumbnail: existingTrack.thumbnail,
                duration: existingTrack.duration,
                audioUrl: existingTrack.audioUrl,
                status: 'ready',
                isStreamUrl: existingTrack.isStreamUrl,
                addedBy: new Types.ObjectId(userId),
            });
            const saved = await newTrack.save();

            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'added',
                trackId: saved._id.toString(),
                status: 'ready',
                track: saved
            });

            return {
                found: true,
                track: saved
            };
        }

        return {
            found: false,
            youtubeVideoId,
        };
    }

    async addTrackToRoom(roomId: string, userId: string, addTrackDto: AddTrackDto) {
        const room = await this.roomModel.findById(roomId);
        if (!room) throw new NotFoundException('Room not found');

        const youtubeUrl = addTrackDto.youtubeUrl;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = youtubeUrl.match(regExp);
        const youtubeVideoId = (match && match[7].length === 11) ? match[7] : null;

        if (!youtubeVideoId) throw new BadRequestException('Invalid YouTube URL');

        // Case 1: Mobile already has the info (detached by mobile) OR server already has info
        const title = addTrackDto.title || '';
        const thumbnail = addTrackDto.thumbnail || `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`;
        const audioUrl = addTrackDto.audioUrl || '';
        const duration = addTrackDto.duration || 0;

        // Trust mobile if info is provided
        if (title && audioUrl) {
            const newTrack = new this.trackModel({
                roomId: new Types.ObjectId(roomId),
                youtubeVideoId,
                title,
                thumbnail,
                duration,
                audioUrl,
                status: 'ready',
                isStreamUrl: true, // If mobile sends link, it's likely a stream link
                addedBy: new Types.ObjectId(userId),
            });
            const saved = await newTrack.save();
            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'added',
                trackId: saved._id.toString(),
                status: 'ready',
                track: saved
            });
            return saved;
        }

        // Case 2: Server already prepared this track for another room
        const existingReady = await this.trackModel.findOne({ youtubeVideoId, status: 'ready' });
        if (existingReady) {
            const newTrack = new this.trackModel({
                roomId: new Types.ObjectId(roomId),
                youtubeVideoId,
                title: existingReady.title,
                thumbnail: existingReady.thumbnail,
                duration: existingReady.duration,
                audioUrl: existingReady.audioUrl,
                status: 'ready',
                isStreamUrl: existingReady.isStreamUrl,
                addedBy: new Types.ObjectId(userId),
            });
            const saved = await newTrack.save();
            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'added',
                trackId: saved._id.toString(),
                status: 'ready',
                track: saved
            });
            return saved;
        }

        // Case 3: Start background processing
        const existingProcessing = await this.trackModel.findOne({ youtubeVideoId, status: 'processing' });

        const newTrack = new this.trackModel({
            roomId: new Types.ObjectId(roomId),
            youtubeVideoId,
            title: existingProcessing?.title || 'Đang lấy thông tin...',
            thumbnail: existingProcessing?.thumbnail || `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
            duration: existingProcessing?.duration || 0,
            status: 'processing',
            addedBy: new Types.ObjectId(userId),
        });

        const savedTrack = await newTrack.save();

        if (!existingProcessing) {
            await this.audioQueue.add('convert', {
                trackId: savedTrack._id.toString(),
                youtubeUrl: youtubeUrl,
                youtubeVideoId: youtubeVideoId,
                roomId: roomId,
            });
        }

        this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
            type: 'added',
            trackId: savedTrack._id.toString(),
            status: 'processing',
            track: savedTrack
        });

        return savedTrack;
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

        // 2. Emit update & skip track logic 
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
