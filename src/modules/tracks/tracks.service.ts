import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
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
    private readonly logger = new Logger(TracksService.name);
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
        if (!room) throw new NotFoundException('Không tìm thấy phòng');

        const youtubeUrl = addTrackDto.youtubeUrl;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = youtubeUrl.match(regExp);
        const youtubeVideoId = (match && match[7].length === 11) ? match[7] : null;

        if (!youtubeVideoId) throw new BadRequestException('Link YouTube không hợp lệ');

        // --- STEP 1: CHECK IF READY (Re-use existing audio) ---
        const existingReady = await this.trackModel.findOne({ youtubeVideoId, status: 'ready' }).sort({ createdAt: -1 });

        if (existingReady) {
            this.logger.log(`♻️  Reusing existing track: ${youtubeVideoId}`);
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

        // --- STEP 2: CHECK IF PROCESSING (Join existing queue) ---
        // Use findOne and sort by newest to ensure we find any current processing track
        const existingProcessing = await this.trackModel.findOne({
            youtubeVideoId,
            status: 'processing'
        }).sort({ createdAt: -1 });

        if (existingProcessing) {
            this.logger.log(`🔗 Joining existing processing job for: ${youtubeVideoId}`);
            const newTrack = new this.trackModel({
                roomId: new Types.ObjectId(roomId),
                youtubeVideoId,
                title: existingProcessing.title || 'Đang chờ xử lý...',
                thumbnail: existingProcessing.thumbnail || `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
                duration: existingProcessing.duration || 0,
                status: 'processing',
                addedBy: new Types.ObjectId(userId),
            });
            const saved = await newTrack.save();

            this.eventsGateway.emitToCoupleRoom(roomId, 'queue:update', {
                type: 'added',
                trackId: saved._id.toString(),
                status: 'processing',
                track: saved
            });
            return saved;
        }

        // --- STEP 3: CREATE NEW PROCESSING JOB ---
        const newTrack = new this.trackModel({
            roomId: new Types.ObjectId(roomId),
            youtubeVideoId,
            title: 'Đang tải thông tin...',
            thumbnail: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
            duration: 0,
            status: 'processing',
            addedBy: new Types.ObjectId(userId),
        });

        const savedTrack = await newTrack.save();

        try {
            this.logger.log(`🚀 Dispatching new task to Worker: ${youtubeVideoId}`);
            
            // Xóa job cũ nếu bị kẹt trong Redis để đảm bảo job mới được chạy
            const jobId = `yt-${youtubeVideoId}`;
            const oldJob = await this.audioQueue.getJob(jobId);
            if (oldJob) {
                await oldJob.remove();
                this.logger.debug(`🗑️ Removed old stuck job in Redis: ${jobId}`);
            }

            await this.audioQueue.add('convert', {
                trackId: savedTrack._id.toString(),
                youtubeUrl: youtubeUrl,
                youtubeVideoId: youtubeVideoId,
                roomId: roomId,
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: true,
                jobId: jobId, 
            });
        } catch (queueError) {
            this.logger.error(`❌ Queue Error: Redis is likely DOWN. Please start Redis!`);
            // Optional: Mark as failed if queue is down
            savedTrack.status = 'failed';
            await savedTrack.save();
            throw new BadRequestException('Hệ thống xử lý đang bận (Redis down), vui lòng thử lại sau.');
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
