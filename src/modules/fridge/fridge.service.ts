import {
  Injectable,
  BadRequestException,
  NotFoundException,
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
    'https://res.cloudinary.com/dukoun1pb/image/upload/v1767624981/note_pink_dog_tilted-removebg-preview_fdj4jc.png'
  ];

  // Default background for fridge
  private readonly FRIDGE_BACKGROUND = {
    imageUrl:
      'https://res.cloudinary.com/dukoun1pb/image/upload/v1767624634/Group_1000009246_nb08lu.png',
    aspectRatio: '9:16',
  };

  constructor(
    @InjectModel(FridgeNote.name)
    private fridgeNoteModel: Model<FridgeNoteDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Get fridge home data (background + 2 latest notes)
   */
  async getFridgeHome(user: any) {
    // Check if user is in a couple
    if (!user.coupleRoomId) {
      throw new BadRequestException('User is not in a couple');
    }

    // Get 2 latest notes for this couple
    const notes = await this.fridgeNoteModel
      .find({ coupleId: user.coupleRoomId })
      .sort({ createdAt: -1 })
      .limit(2)
      .exec();

    // Format notes for response
    const formattedNotes = notes.map((note) => ({
      id: note._id.toString(),
      content: note.content,
      frameImageUrl: note.frameImageUrl,
      position: {
        x: note.positionX,
        y: note.positionY,
      },
      rotation: note.rotation,
      zIndex: notes.length - notes.indexOf(note), // First note has higher zIndex
      createdAt: (note.createdAt || new Date()).toISOString(),
    }));

    return {
      background: this.FRIDGE_BACKGROUND,
      notes: formattedNotes,
    };
  }

  /**
   * Create a new fridge note
   */
  async createNote(user: any, content: string) {
    // Check if user is in a couple
    if (!user.coupleRoomId) {
      throw new BadRequestException('User is not in a couple');
    }

    // Generate random frame image URL
    const frameImageUrl =
      this.NOTE_FRAMES[
        Math.floor(Math.random() * this.NOTE_FRAMES.length)
      ];

    // Generate random rotation (-5 to +5 degrees)
    const rotation = Math.random() * 10 - 5; // -5 to +5

    // Generate random position (x, y between 0.2 and 0.8 to avoid edges)
    const positionX = 0.2 + Math.random() * 0.6; // 0.2 to 0.8
    const positionY = 0.2 + Math.random() * 0.6; // 0.2 to 0.8

    // Create note in database
    const note = await this.fridgeNoteModel.create({
      coupleId: user.coupleRoomId,
      content,
      frameImageUrl,
      positionX,
      positionY,
      rotation,
    });

    // Format note for response and realtime event
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

    // Emit realtime event to couple room
    try {
      this.eventsGateway.emitToCoupleRoom(
        user.coupleRoomId,
        'fridge:note:new',
        {
          note: formattedNote,
        },
      );
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to emit realtime event:', error);
    }

    // Return minimal response
    return {
      id: note._id.toString(),
      createdAt: (note.createdAt || new Date()).toISOString(),
    };
  }
}

