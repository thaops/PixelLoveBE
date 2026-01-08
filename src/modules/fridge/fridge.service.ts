import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FridgeNote, FridgeNoteDocument } from './schemas/fridge-note.schema';
import { EventsGateway } from '../events/events.gateway';
import { User, UserDocument } from '../user/schemas/user.schema';

/**
 * Fridge Service
 * Manages fridge notes for Home - Fridge feature
 */
@Injectable()
export class FridgeService {
  // List of available note frame images
  private readonly NOTE_FRAMES = [
    'https://res.cloudinary.com/dukoun1pb/image/upload/v1767624981/note_pink_dog_tilted-removebg-preview_fdj4jc.png',
  ];

  // Default background for fridge
  private readonly FRIDGE_BACKGROUND = {
    imageUrl:
      'https://res.cloudinary.com/dukoun1pb/image/upload/v1767624634/Group_1000009246_nb08lu.png',
    aspectRatio: '9:16',
  };

  // Fixed positions for notes on board (all y < 0.30)
  private readonly FIXED_BOARD_POSITIONS = [
    { x: 0.35, y: 0.25 }, // giữa
    { x: 0.72, y: 0.35 }, // trái
    { x: 0.35, y: 0.4 }, // phải
    { x: 0.72, y: 0.45 }, // dưới giữa
  ];

  constructor(
    @InjectModel(FridgeNote.name)
    private fridgeNoteModel: Model<FridgeNoteDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Get fridge home data (background + 4 latest notes)
   * All notes are positioned on the board (fixed positions)
   */
  async getFridgeHome(user: any) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('User is not in a couple');
    }

    // Get 4 latest notes
    const notes = await this.fridgeNoteModel
      .find({ coupleId: user.coupleRoomId })
      .sort({ createdAt: -1 })
      .limit(4)
      .exec();

    // Map notes with fixed board positions (override DB positions)
    const formattedNotes = notes.map((note, index) => ({
      id: note._id.toString(),
      content: note.content,
      frameImageUrl: note.frameImageUrl,
      // Set fixed position from board positions (all y < 0.30)
      position: this.FIXED_BOARD_POSITIONS[index],
      rotation: 0,
      zIndex: notes.length - index, // Newest note has highest zIndex
      createdAt: (note.createdAt || new Date()).toISOString(),
    }));

    return {
      background: this.FRIDGE_BACKGROUND,
      notes: formattedNotes,
    };
  }

  /**
   * Create a new fridge note
   * - First note → board
   * - Others → body
   * - rotation luôn = 0
   */
  async createNote(user: any, content: string) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('User is not in a couple');
    }

    // Count existing notes
    const noteCount = await this.fridgeNoteModel.countDocuments({
      coupleId: user.coupleRoomId,
    });

    // Select frame
    const frameImageUrl =
      this.NOTE_FRAMES[
        Math.floor(Math.random() * this.NOTE_FRAMES.length)
      ];

    // ❗ KHÔNG xoay ảnh
    const rotation = 0;

    let positionX: number;
    let positionY: number;

    if (noteCount === 0) {
      // 🪵 First note → board
      positionX = 0.46 + Math.random() * 0.1;
      positionY = 0.21 + Math.random() * 0.05;
    } else {
      // 🧊 Other notes → body
      positionX = 0.4 + Math.random() * 0.2; // 0.4 → 0.6
      positionY = 0.48 + Math.random() * 0.1; // 0.52 → 0.62
    }

    const note = await this.fridgeNoteModel.create({
      coupleId: user.coupleRoomId,
      content,
      frameImageUrl,
      positionX,
      positionY,
      rotation,
    });

    const formattedNote = {
      id: note._id.toString(),
      content: note.content,
      frameImageUrl: note.frameImageUrl,
      position: {
        x: note.positionX,
        y: note.positionY,
      },
      rotation: note.rotation,
      createdAt: (note.createdAt || new Date()).toISOString(),
    };

    // Emit realtime event
    try {
      this.eventsGateway.emitToCoupleRoom(
        user.coupleRoomId,
        'fridge:note:new',
        { note: formattedNote },
      );
    } catch (error) {
      console.error('Emit fridge:note:new failed', error);
    }

    return {
      id: note._id.toString(),
      createdAt: (note.createdAt || new Date()).toISOString(),
    };
  }
}
