import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoupleRoom, CoupleRoomDocument } from './schemas/couple-room.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { CreateCoupleDto } from './dto/create-couple.dto';
import { JoinCoupleDto } from './dto/join-couple.dto';
import { generateCode } from '../../shared/utils/code-generator.util';
import { generateCoupleCode } from '../../shared/utils/zodiac.util';
import { UserService } from '../user/user.service';
import { EventsGateway } from '../events/events.gateway';

/**
 * Couple Service
 * Manages couple rooms and member relationships
 */
@Injectable()
export class CoupleService {
  private readonly logger = new Logger(CoupleService.name);
  private codeAttempts = new Map<string, { count: number; resetAt: Date }>();

  constructor(
    @InjectModel(CoupleRoom.name)
    private coupleRoomModel: Model<CoupleRoomDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private userService: UserService,
    private eventsGateway: EventsGateway,
  ) { }

  /**
   * Create a new couple room
   * Generates unique code and adds creator as first member
   * Sets mode=couple and generates coupleRoomId
   */
  async createRoom(userId: string, createCoupleDto: CreateCoupleDto) {
    // Check if user already has a couple room
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.mode === 'couple' && user.coupleRoomId) {
      throw new BadRequestException('You are already in a couple');
    }

    // Generate unique code
    let code: string = '';
    let isUnique = false;

    while (!isUnique) {
      code = generateCode(6);
      const existing = await this.coupleRoomModel.findOne({ code });
      if (!existing) {
        isUnique = true;
      }
    }

    // Create couple room with startDate and roomState
    const coupleRoom = await this.coupleRoomModel.create({
      code,
      startDate: new Date(),
      partners: [userId],
      petLevel: 1,
      exp: 0,
      petType: createCoupleDto.petType || 'cat',
      roomState: {
        background: 'default',
        items: [],
        pets: [],
        achievements: [],
      },
    });

    // Update user's mode to couple and set coupleRoomId
    await this.userModel.findByIdAndUpdate(userId, {
      mode: 'couple',
      coupleRoomId: coupleRoom._id.toString(),
    });

    return {
      coupleRoomId: coupleRoom._id,
      code: coupleRoom.code,
      startDate: coupleRoom.startDate,
      partners: coupleRoom.partners,
      roomState: coupleRoom.roomState,
    };
  }

  /**
   * Join an existing couple room using code
   * Links both users, sets mode=couple, and updates startDate
   */
  async joinRoom(userId: string, joinCoupleDto: JoinCoupleDto) {
    const { code } = joinCoupleDto;

    // Find couple room by code
    const coupleRoom = await this.coupleRoomModel.findOne({ code });
    if (!coupleRoom) {
      throw new NotFoundException('Couple room not found');
    }

    // Check if room is full (max 2 members)
    if (coupleRoom.partners.length >= 2) {
      throw new BadRequestException('Couple room is full');
    }

    // Check if user is already in the room
    if (coupleRoom.partners.includes(userId)) {
      throw new BadRequestException('You are already in this room');
    }

    // Check if user already has a partner
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.mode === 'couple' && user.partnerId) {
      throw new BadRequestException('You already have a partner');
    }

    // Add user to room and set startDate when second partner joins
    coupleRoom.partners.push(userId);
    coupleRoom.startDate = new Date(); // Set startDate when couple is complete
    await coupleRoom.save();

    // Get partner info
    const partnerId = coupleRoom.partners.find((id) => id !== userId);
    if (!partnerId) {
      throw new BadRequestException('Partner not found');
    }
    const partner = await this.userModel.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner user not found');
    }

    // Update both users to couple mode and link them
    await this.userModel.findByIdAndUpdate(userId, {
      mode: 'couple',
      partnerId: partnerId,
      coupleRoomId: coupleRoom._id.toString(),
    });

    await this.userModel.findByIdAndUpdate(partnerId, {
      mode: 'couple',
      partnerId: userId,
      coupleRoomId: coupleRoom._id.toString(),
    });

    return {
      coupleRoomId: coupleRoom._id,
      code: coupleRoom.code,
      startDate: coupleRoom.startDate,
      partners: coupleRoom.partners,
      roomState: coupleRoom.roomState,
      partnerInfo: {
        id: partner._id,
        nickname: partner.nickname || partner.displayName, // Ưu tiên nickname
        displayName: partner.displayName,
        avatarUrl: partner.avatarUrl,
        gender: partner.gender,
      },
    };
  }

  /**
   * Get couple room information with full roomState
   */
  async getRoomInfo(coupleRoomId: string) {
    const coupleRoom = await this.coupleRoomModel.findById(coupleRoomId);
    if (!coupleRoom) {
      throw new NotFoundException('Couple room not found');
    }

    // Get partner details
    const partners = await this.userModel
      .find({ _id: { $in: coupleRoom.partners } })
      .select('_id nickname displayName avatarUrl gender birthDate');

    const [userA, userB] = partners;

    return {
      coupleId: coupleRoom._id,
      userA: userA
        ? {
          userId: userA._id,
          nickname: userA.nickname || userA.displayName, // Ưu tiên nickname
          displayName: userA.displayName,
          avatarUrl: userA.avatarUrl,
        }
        : null,
      userB: userB
        ? {
          userId: userB._id,
          nickname: userB.nickname || userB.displayName, // Ưu tiên nickname
          displayName: userB.displayName,
          avatarUrl: userB.avatarUrl,
        }
        : null,
      loveStartDate: coupleRoom.startDate,
      createdDate: (coupleRoom as any).createdAt || new Date(),
    };
  }

  /**
   * Add experience to couple room
   * Used when feeding pet or uploading memories
   */
  async addExp(coupleRoomId: string, expAmount: number) {
    const coupleRoom = await this.coupleRoomModel.findById(coupleRoomId);
    if (!coupleRoom) {
      throw new NotFoundException('Couple room not found');
    }

    coupleRoom.exp += expAmount;

    // Level up logic (100 exp per level)
    const expPerLevel = 100;
    while (coupleRoom.exp >= expPerLevel) {
      coupleRoom.exp -= expPerLevel;
      coupleRoom.petLevel += 1;
    }

    await coupleRoom.save();

    return {
      petLevel: coupleRoom.petLevel,
      exp: coupleRoom.exp,
      leveledUp: true,
    };
  }

  /**
   * Set love start date
   */
  async setLoveDate(coupleRoomId: string, date: string) {
    const coupleRoom = await this.coupleRoomModel.findById(coupleRoomId);
    if (!coupleRoom) {
      throw new NotFoundException('Couple room not found');
    }
    coupleRoom.startDate = new Date(date);
    await coupleRoom.save();
    return { success: true };
  }

  /**
   * Get love info (loveStartDate, daysTogether)
   */
  async getLoveInfo(coupleRoomId: string) {
    const coupleRoom = await this.coupleRoomModel.findById(coupleRoomId);
    if (!coupleRoom || !coupleRoom.startDate) {
      throw new NotFoundException('Couple room not found');
    }
    const loveStartDate = coupleRoom.startDate;
    const now = new Date();
    const diffMs = now.getTime() - loveStartDate.getTime();
    const daysTogether = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return { loveStartDate, daysTogether };
  }

  /**
   * Generate unique couple code for user
   * User can share this code with their partner to connect
   */
  async generateCoupleCode(userId: string) {
    // Check if user already has a couple code
    let user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check existing code và expiration
    if (user.coupleCode) {
      const now = new Date();
      if (user.coupleCodeExpiresAt && user.coupleCodeExpiresAt > now) {
        // Code còn hạn - trả về code hiện tại
        return {
          coupleCode: user.coupleCode,
          expiresAt: user.coupleCodeExpiresAt,
          message: 'You already have a couple code',
        };
      } else {
        // Code hết hạn hoặc không có expiration - xóa và tạo mới
        await this.userModel.findByIdAndUpdate(userId, {
          $unset: { coupleCode: '', coupleCodeExpiresAt: '' },
        });
        // Reload user after unset
        user = await this.userModel.findById(userId);
        if (!user) {
          throw new NotFoundException('User not found');
        }
      }
    }

    // Check if user is already in couple mode
    if (user.mode === 'couple' && user.partnerId) {
      throw new BadRequestException('You are already connected with a partner');
    }

    // Generate unique couple code
    let coupleCode: string = '';
    let isUnique = false;

    while (!isUnique) {
      coupleCode = generateCoupleCode(6);
      const existing = await this.userModel.findOne({ coupleCode });
      if (!existing) {
        isUnique = true;
      }
    }

    // Set expiration: 48 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Save couple code to user
    user.coupleCode = coupleCode;
    user.coupleCodeExpiresAt = expiresAt;
    await user.save();

    return {
      coupleCode,
      expiresAt,
      message: 'Couple code generated successfully. Share this with your partner!',
    };
  }

  /**
   * Join couple using partner's couple code
   * Connects two users as partners and creates couple room with startDate
   */
  async joinCoupleByCode(userId: string, coupleCode: string) {
    // Rate limiting: max 5 attempts per 15 minutes
    const attemptKey = `code_attempt:${userId}`;
    const attempts = this.codeAttempts.get(attemptKey);

    if (attempts) {
      const now = new Date();
      if (attempts.resetAt < now) {
        // Reset counter after 15 minutes
        this.codeAttempts.delete(attemptKey);
      } else if (attempts.count >= 5) {
        const minutesLeft = Math.ceil(
          (attempts.resetAt.getTime() - now.getTime()) / (1000 * 60),
        );
        throw new BadRequestException(
          `Too many failed attempts. Please wait ${minutesLeft} minutes before trying again.`,
        );
      }
    }

    try {
      // Find user by couple code
      const partner = await this.userModel.findOne({ coupleCode });
      if (!partner) {
        // Increment attempt counter on failure
        this.incrementAttempt(attemptKey);
        throw new NotFoundException('Invalid couple code');
      }

      // Check code expiration
      if (partner.coupleCodeExpiresAt) {
        const now = new Date();
        if (partner.coupleCodeExpiresAt < now) {
          this.incrementAttempt(attemptKey);
          throw new BadRequestException(
            'Couple code has expired. Please ask your partner to generate a new code.',
          );
        }
      }

      // Check if trying to use own code
      if (partner._id.toString() === userId) {
        this.incrementAttempt(attemptKey);
        throw new BadRequestException('You cannot use your own couple code');
      }

      // Check if partner is already connected
      if (partner.mode === 'couple' && partner.partnerId) {
        this.incrementAttempt(attemptKey);
        throw new BadRequestException('This user is already connected with someone');
      }

      // Check if current user is already connected
      const currentUser = await this.userModel.findById(userId);
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      if (currentUser.mode === 'couple' && currentUser.partnerId) {
        throw new BadRequestException('You are already connected with a partner');
      }

      // Create couple room with startDate
      const coupleRoom = await this.coupleRoomModel.create({
        code: generateCode(6),
        startDate: new Date(), // Set startDate when couple is formed
        partners: [userId, partner._id.toString()],
        petLevel: 1,
        exp: 0,
        petType: 'cat',
        roomState: {
          background: 'default',
          items: [],
          pets: [],
          achievements: [],
        },
      });

      // Update both users to couple mode
      await this.userModel.findByIdAndUpdate(userId, {
        mode: 'couple',
        partnerId: partner._id.toString(),
        coupleRoomId: coupleRoom._id.toString(),
      });

      await this.userModel.findByIdAndUpdate(partner._id, {
        mode: 'couple',
        partnerId: userId,
        coupleRoomId: coupleRoom._id.toString(),
        coupleCode: null, // Clear the code after successful connection
        coupleCodeExpiresAt: null, // Clear expiration too
      });

      // Clear attempts on success
      this.codeAttempts.delete(attemptKey);

      // Emit socket event to both users about successful pairing
      const pairingEvent = {
        coupleRoomId: coupleRoom._id.toString(),
        startDate: coupleRoom.startDate,
        partner: {
          userId: partner._id.toString(),
          nickname: partner.nickname || partner.displayName, // Ưu tiên nickname
          displayName: partner.displayName,
          avatarUrl: partner.avatarUrl,
          gender: partner.gender,
        },
        currentUser: {
          userId: currentUser._id.toString(),
          nickname: currentUser.nickname || currentUser.displayName, // Ưu tiên nickname
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
          gender: currentUser.gender,
        },
        roomState: coupleRoom.roomState,
      };

      // Emit to both users individually
      this.eventsGateway.emitToUser(userId, 'couplePaired', pairingEvent);
      this.eventsGateway.emitToUser(
        partner._id.toString(),
        'couplePaired',
        pairingEvent,
      );

      // Also emit to couple room (if they're already connected)
      this.eventsGateway.emitToCoupleRoom(
        coupleRoom._id.toString(),
        'coupleRoomUpdated',
        {
          coupleRoomId: coupleRoom._id.toString(),
          partners: [userId, partner._id.toString()],
          startDate: coupleRoom.startDate,
        },
      );

      return {
        message: 'Successfully connected as couple!',
        coupleRoomId: coupleRoom._id,
        startDate: coupleRoom.startDate,
        partnerId: partner._id,
        partnerName: partner.nickname || partner.displayName, // Ưu tiên nickname
        partnerAvatar: partner.avatarUrl,
        partnerGender: partner.gender,
        roomState: coupleRoom.roomState,
      };
    } catch (error) {
      // Log failed attempt (only for invalid code, not for other errors)
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        this.logger.warn(
          `Failed couple code attempt by user ${userId}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Increment attempt counter for rate limiting
   */
  private incrementAttempt(attemptKey: string) {
    const currentAttempts =
      this.codeAttempts.get(attemptKey) || { count: 0, resetAt: new Date() };
    currentAttempts.count += 1;
    currentAttempts.resetAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    this.codeAttempts.set(attemptKey, currentAttempts);
  }

  /**
   * Get single home view for user
   * Shows if they are in a couple, their code, and if it's expired
   */
  async getSingleHome(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine step based on code status
    let step: 'no_code' | 'waiting_partner' | 'code_expired' = 'no_code';
    let canShare = false;
    let codeExpiresAt: Date | null = null;
    let expiresInMinutes: number | null = null;

    if (user.coupleCode) {
      const now = new Date();
      if (user.coupleCodeExpiresAt && user.coupleCodeExpiresAt < now) {
        // Code đã hết hạn
        step = 'code_expired';
        canShare = false;
      } else {
        // Code còn hạn
        step = 'waiting_partner';
        canShare = true;
        codeExpiresAt = user.coupleCodeExpiresAt;
        if (codeExpiresAt) {
          expiresInMinutes = Math.ceil(
            (codeExpiresAt.getTime() - now.getTime()) / (1000 * 60),
          );
        }
      }
    }

    return {
      mode: 'single',
      isCouple: false,
      myCode: user.coupleCode || null,
      codeExpiresAt,
      expiresInMinutes,
      partner: null,
      ui: {
        step, // Explicit step: 'no_code' | 'waiting_partner' | 'code_expired'
        canShare,
        message: this.getStepMessage(step),
      },
    };
  }

  /**
   * Get step message for UI
   */
  private getStepMessage(step: string): string {
    switch (step) {
      case 'no_code':
        return 'Create a code to connect with your partner';
      case 'waiting_partner':
        return 'Share your code with your partner';
      case 'code_expired':
        return 'Your code has expired. Please generate a new one';
      default:
        return '';
    }
  }

  /**
   * Break up / Leave couple
   * Removes couple connection and resets user state
   *
   * Options:
   * - Soft delete: Keep history (recommended for future)
   * - Hard delete: Remove completely (current implementation)
   */
  async breakUp(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.coupleRoomId || !user.partnerId) {
      throw new BadRequestException('You are not in a couple');
    }

    const coupleRoom = await this.coupleRoomModel.findById(user.coupleRoomId);
    if (!coupleRoom) {
      throw new NotFoundException('Couple room not found');
    }

    const partnerId = user.partnerId;

    // Option 1: Soft delete - Keep history (recommended)
    // Uncomment if you want to keep couple history
    // coupleRoom.isActive = false;
    // coupleRoom.brokenUpAt = new Date();
    // await coupleRoom.save();

    // Option 2: Hard delete - Remove completely (current)
    await this.coupleRoomModel.findByIdAndDelete(user.coupleRoomId);

    // Delete both users completely
    await this.userModel.findByIdAndDelete(userId);
    await this.userModel.findByIdAndDelete(partnerId);

    // Emit break up event to both users (all their devices)
    const breakUpEvent = {
      message: 'Couple connection ended',
      timestamp: new Date(),
      coupleRoomId: user.coupleRoomId,
    };

    this.eventsGateway.emitToUser(userId, 'coupleBrokenUp', breakUpEvent);
    this.eventsGateway.emitToUser(partnerId, 'coupleBrokenUp', breakUpEvent);

    // Also emit to couple room (if sockets still connected)
    this.eventsGateway.emitToCoupleRoom(
      user.coupleRoomId,
      'coupleRoomDeleted',
      {
        message: 'Couple room has been deleted',
        timestamp: new Date(),
      },
    );

    return {
      message: 'Successfully left the couple',
      success: true,
    };
  }
  /**
   * Get batch info for multiple couples (optimization for leaderboard)
   */
  async getCouplesBatchInfo(coupleIds: string[]) {
    // Ensure coupleIds are valid ObjectIDs if needed, but find({ _id: { $in: strings } }) usually works in Mongoose.
    // However, room.partners might be strings or ObjectIds.

    const coupleRooms = await this.coupleRoomModel
      .find({ _id: { $in: coupleIds } })
      .lean();

    const allUserIds = coupleRooms.flatMap((room) => room.partners.map(p => p.toString()));
    const uniqueUserIds = [...new Set(allUserIds)];

    const users = await this.userModel
      .find({ _id: { $in: uniqueUserIds } })
      .select('_id nickname displayName avatarUrl')
      .lean();

    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(String(user._id), user);
    });

    const result = new Map();

    coupleRooms.forEach((room) => {
      const partners = (room.partners || []).map((id) => {
        const idStr = String(id);
        const user = userMap.get(idStr);
        if (user) return user;

        // Fallback for missing user
        return {
          _id: idStr,
          nickname: 'Unknown User',
          displayName: 'Unknown',
          avatarUrl: ''
        };
      });

      const members = partners.map((p) => ({
        userId: String(p._id),
        name: p.nickname || p.displayName || 'User',
        avatarUrl: p.avatarUrl || '',
      }));

      // Calculate love days (extra metric)
      const loveStartDate = room.startDate ? new Date(room.startDate) : new Date();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - loveStartDate.getTime());
      const daysInLove = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Determine room background URL
      // If roomState.background is 'default' or null, use default image
      let backgroundUrl = 'https://res.cloudinary.com/dukoun1pb/image/upload/v1768313007/back_ground_pet_1_m6frgf.png';
      if (room.roomState && room.roomState.background && room.roomState.background !== 'default') {
        // If it's a custom background ID/URL
        if (room.roomState.background.startsWith('http')) {
          backgroundUrl = room.roomState.background;
        }
      }

      result.set(String(room._id), {
        coupleId: String(room._id),
        members,
        daysInLove,
        backgroundUrl,
      });
    });

    return result;
  }
}

