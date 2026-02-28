import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { PetAction, PetActionDocument } from './schemas/pet-action.schema';
import { PetReaction, PetReactionDocument } from './schemas/pet-reaction.schema';
import { Streak, StreakDocument } from '../streak/schemas/streak.schema';
import { AlbumService } from '../album/album.service';
import { CoupleService } from '../couple/couple.service';
import { EventsGateway } from '../events/events.gateway';
import { CloudinaryService } from '../album/cloudinary.service';
import { StreakService } from '../streak/streak.service';
import { NotificationService } from '../notification/notification.service';
import { PET_IMAGE_MOODS, PetImageMood } from './pet.constants';

/**
 * Pet Service
 * Handles pet progression with petting/image actions and bonus logic
 */
@Injectable()
export class PetService {
  private readonly EXP_PER_LEVEL = 500;
  private readonly PETTING_EXP = 5;
  private readonly PETTING_BONUS = 5;
  private readonly IMAGE_EXP = 20;
  private readonly IMAGE_BONUS = 20;
  private readonly VOICE_EXP = 15;
  private readonly VOICE_BONUS = 15;
  private readonly RECENT_IMAGES_LIMIT = 5;
  private readonly THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetAction.name)
    private petActionModel: Model<PetActionDocument>,
    @InjectModel(PetReaction.name)
    private petReactionModel: Model<PetReactionDocument>,
    private albumService: AlbumService,
    private coupleService: CoupleService,
    private eventsGateway: EventsGateway,
    private cloudinaryService: CloudinaryService,
    private streakService: StreakService,
    private notificationService: NotificationService,
    @InjectModel(Streak.name) private streakModel: Model<StreakDocument>,
  ) { }

  /**
   * Get or create pet for couple
   */
  async getPetForCouple(coupleId: string): Promise<PetDocument> {
    let pet = await this.petModel.findOne({ coupleId });
    if (!pet) {
      pet = await this.petModel.create({
        coupleId,
        level: 1,
        experience: 0,
        lastUpdatedAt: new Date(),
      });
    }
    return pet;
  }

  /**
   * Get today's date range (start and end of day in UTC)
   * @deprecated Still used for petting bonus logic
   */
  private getTodayDateRange(): { start: Date; end: Date } {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    return { start, end };
  }

  /**
   * Check cooldown for image action (3 hours) - with atomic check to prevent race condition
   */
  private async checkImageCooldown(
    coupleId: string,
    userId: string,
  ): Promise<void> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - this.THREE_HOURS_MS);

    // Atomic check: find if there's any action within last 3 hours
    const recentAction = await this.petActionModel.findOne({
      coupleId,
      userId,
      type: 'image',
      actionAt: { $gte: threeHoursAgo },
    }).lean();

    if (recentAction) {
      const timeSinceLastAction = now.getTime() - recentAction.actionAt.getTime();
      const remainingMs = this.THREE_HOURS_MS - timeSinceLastAction;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      throw new BadRequestException(
        `IMAGE_COOLDOWN: Please wait ${remainingMinutes} more minutes`,
      );
    }
  }

  /**
   * Check if partner sent image within last 3 hours (for bonus)
   * Returns the partner action if found, null otherwise
   */
  private async checkPartnerImageInLast3Hours(
    coupleId: string,
    currentUserId: string,
  ): Promise<PetActionDocument | null> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - this.THREE_HOURS_MS);

    // Get partner ID
    const coupleRoom = await this.coupleService.getRoomInfo(coupleId);
    const currentUserIdStr = currentUserId.toString();
    const partnerId =
      coupleRoom.userA?.userId?.toString() === currentUserIdStr
        ? coupleRoom.userB?.userId?.toString()
        : coupleRoom.userA?.userId?.toString();

    if (!partnerId) {
      return null;
    }

    // Check partner's last image action within 3 hours
    const partnerAction = await this.petActionModel
      .findOne({
        coupleId,
        userId: partnerId,
        type: 'image',
        actionAt: { $gte: threeHoursAgo },
      })
      .sort({ actionAt: -1 })
      .lean();

    return partnerAction as PetActionDocument | null;
  }

  private async checkVoiceCooldown(
    coupleId: string,
    userId: string,
  ): Promise<void> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - this.THREE_HOURS_MS);

    const recentAction = await this.petActionModel.findOne({
      coupleId,
      userId,
      type: 'voice',
      actionAt: { $gte: threeHoursAgo },
    }).lean();

    if (recentAction) {
      const timeSinceLastAction = now.getTime() - recentAction.actionAt.getTime();
      const remainingMs = this.THREE_HOURS_MS - timeSinceLastAction;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      throw new BadRequestException(
        `VOICE_COOLDOWN: Please wait ${remainingMinutes} more minutes`,
      );
    }
  }

  private async checkPartnerVoiceInLast3Hours(
    coupleId: string,
    currentUserId: string,
  ): Promise<PetActionDocument | null> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - this.THREE_HOURS_MS);

    const coupleRoom = await this.coupleService.getRoomInfo(coupleId);
    const currentUserIdStr = currentUserId.toString();
    const partnerId =
      coupleRoom.userA?.userId?.toString() === currentUserIdStr
        ? coupleRoom.userB?.userId?.toString()
        : coupleRoom.userA?.userId?.toString();

    if (!partnerId) {
      return null;
    }

    const partnerAction = await this.petActionModel
      .findOne({
        coupleId,
        userId: partnerId,
        type: 'voice',
        actionAt: { $gte: threeHoursAgo },
      })
      .sort({ actionAt: -1 })
      .lean();

    return partnerAction as PetActionDocument | null;
  }

  /**
   * Check if both users did action today
   */
  private async checkBothUsersDidActionToday(
    coupleId: string,
    currentUserId: string,
    actionType: 'petting' | 'image',
  ): Promise<boolean> {
    const { start, end } = this.getTodayDateRange();

    // Get couple room to find partner
    const coupleRoom = await this.coupleService.getRoomInfo(coupleId);
    const currentUserIdStr = currentUserId.toString();
    const partnerId =
      coupleRoom.userA?.userId?.toString() === currentUserIdStr
        ? coupleRoom.userB?.userId?.toString()
        : coupleRoom.userA?.userId?.toString();

    if (!partnerId) {
      return false;
    }

    // Check if both users did this action today
    const [currentUserAction, partnerAction] = await Promise.all([
      this.petActionModel.findOne({
        coupleId,
        userId: currentUserId,
        type: actionType,
        createdAt: { $gte: start, $lte: end },
      }),
      this.petActionModel.findOne({
        coupleId,
        userId: partnerId,
        type: actionType,
        createdAt: { $gte: start, $lte: end },
      }),
    ]);

    return !!(currentUserAction && partnerAction);
  }

  /**
   * Apply EXP and level up
   */
  private applyExp(pet: PetDocument, expAmount: number): boolean {
    pet.experience += expAmount;
    pet.lastUpdatedAt = new Date();

    let leveledUp = false;
    while (pet.experience >= this.EXP_PER_LEVEL) {
      pet.experience -= this.EXP_PER_LEVEL;
      pet.level += 1;
      leveledUp = true;
    }

    return leveledUp;
  }


  /**
   * GET /pet
   * Get pet status with recent images
   */
  async getPet(user: any) {
    if (!user.coupleRoomId) {
      return {
        level: 1,
        exp: 0,
        nextLevelExp: this.EXP_PER_LEVEL,
        recentImages: [],
        streak: 0,
      };
    }

    const pet = await this.getPetForCouple(user.coupleRoomId);
    const nextLevelExp =
      this.EXP_PER_LEVEL - (pet.experience % this.EXP_PER_LEVEL);

    const streakData = await this.streakService.getStreak(user.coupleRoomId);
    const displayStreak = streakData.days;

    // Get recent images (last 5) - sort by actionAt (fallback to createdAt for old data)
    const recentActions = await this.petActionModel
      .find({
        coupleId: user.coupleRoomId,
        type: 'image',
        imageUrl: { $exists: true, $ne: null },
      })
      .sort({ actionAt: -1, createdAt: -1 }) // Sort by actionAt first, then createdAt as fallback
      .limit(this.RECENT_IMAGES_LIMIT)
      .select('imageUrl userId actionAt createdAt')
      .lean();

    const recentImages = recentActions.map((action) => {
      const createdAt = (action as any).createdAt || new Date();
      const actionAt = action.actionAt || createdAt; // Fallback to createdAt for old data
      return {
        url: action.imageUrl,
        createdAt: actionAt, // Use actionAt for display (fallback to createdAt)
        userId: action.userId,
      };
    });

    // Streak is now handled by StreakService
    const finalStreak = displayStreak;

    return {
      level: pet.level,
      exp: pet.experience,
      nextLevelExp,
      recentImages,
      streak: finalStreak,
    };
  }

  /**
   * POST /pet/petting
   * Pet the pet (vuốt pet)
   */
  async petting(user: any) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    const pet = await this.getPetForCouple(user.coupleRoomId);
    const userId = user._id.toString();

    // Log action
    await this.petActionModel.create({
      coupleId: user.coupleRoomId,
      userId,
      type: 'petting',
    });

    // Calculate EXP
    let expGained = this.PETTING_EXP;
    let bonus = 0;

    // Check bonus (both users petted today)
    const bothPetted = await this.checkBothUsersDidActionToday(
      user.coupleRoomId,
      userId,
      'petting',
    );

    if (bothPetted) {
      bonus = this.PETTING_BONUS;
      expGained += bonus;
    }

    // Apply EXP and check level up
    await this.streakService.recordInteraction(userId, user.coupleRoomId);
    await this.notificationService.sendInteractionPush(userId);
    const leveledUp = this.applyExp(pet, expGained);
    await pet.save();

    return {
      expAdded: expGained,
      bonus,
      levelUp: leveledUp,
    };
  }

  /**
   * POST /pet/image
   * Send image to pet with proper cooldown and bonus logic
   * 
   * Logic:
   * - Cooldown: 3 hours between image actions (enforced by backend)
   * - Bonus: +20 EXP if partner sent image within last 3 hours
   * - Base: 20 EXP per image
   * - Image saved to both PetAction history and shared Album
   */
  async sendImage(
    user: any,
    imageUrl: string,
    takenAt?: string,
    text?: string,
    mood?: string,
  ) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    // Validate URL format
    if (!imageUrl.startsWith('http')) {
      throw new BadRequestException('Invalid image url');
    }

    const pet = await this.getPetForCouple(user.coupleRoomId);
    const userId = user._id.toString();
    const now = new Date();

    // Sanitize mood: allow only predefined values, else null
    const cleanedMood = PET_IMAGE_MOODS.includes(mood as PetImageMood)
      ? (mood as PetImageMood)
      : null;

    // 👇 BƯỚC 1: Cooldown removed (cho phép gửi tự do)

    // 👇 BƯỚC 2: Check bonus (partner sent image within 3 hours)
    const partnerAction = await this.checkPartnerImageInLast3Hours(
      user.coupleRoomId,
      userId,
    );

    // 👇 BƯỚC 3: Calculate EXP
    const baseExp = this.IMAGE_EXP; // 20
    const bonusExp = partnerAction ? this.IMAGE_BONUS : 0; // 20 or 0
    const totalExp = baseExp + bonusExp;

    // 👇 BƯỚC 4: Process takenAt (clamp to now if future)
    let takenAtDate: Date | undefined = undefined;
    if (takenAt) {
      takenAtDate = new Date(takenAt);
      // Clamp: không cho future date
      if (takenAtDate > now) {
        takenAtDate = now;
      }
    }

    // 👇 BƯỚC 5: Save action với đầy đủ thông tin
    const actionAt = now; // Thời điểm logic
    const savedAction = await this.petActionModel.create({
      coupleId: user.coupleRoomId,
      userId,
      type: 'image',
      imageUrl,
      actionAt,
      takenAt: takenAtDate,
      baseExp,
      bonusExp,
      text,
      mood: cleanedMood,
    });

    // 👇 BƯỚC 6: Save to album (shared album)
    await this.albumService.addPhoto(user, imageUrl);

    // 👇 BƯỚC 7: Apply EXP and check level up
    await this.streakService.recordInteraction(userId, user.coupleRoomId);
    await this.notificationService.sendInteractionPush(userId);
    const leveledUp = this.applyExp(pet, totalExp);
    await pet.save();

    // 👇 BƯỚC 8: Emit socket event to couple room
    // Event: 'pet:image_consumed'
    // Emitted to: couple:{coupleRoomId} room (both users receive it)
    // Payload format:
    // {
    //   petId: string,
    //   actionId: string,
    //   fromUserId: string,
    //   expAdded: number,
    //   baseExp: number,
    //   bonusExp: number,
    //   leveledUp: boolean,
    //   pet: { level: number, currentExp: number },
    //   actionAt: string (ISO)
    // }
    this.eventsGateway.emitToCoupleRoom(
      user.coupleRoomId,
      'pet:image_consumed',
      {
        petId: pet._id.toString(),
        actionId: savedAction._id.toString(),
        imageUrl,
        fromUserId: userId,
        expAdded: totalExp,
        baseExp,
        bonusExp,
        leveledUp,
        pet: {
          level: pet.level,
          currentExp: pet.experience,
        },
        actionAt: actionAt.toISOString(),
        mood: cleanedMood || null,
        text: text || null,
      },
    );

    return {
      expAdded: totalExp,
      bonus: bonusExp,
      levelUp: leveledUp,
      actionId: savedAction._id.toString(),
    };
  }

  /**
   * GET /pet/images
   * Get pet images gallery with pagination
   * Returns full information including EXP and timestamps
   */
  async getImages(user: any, page: number = 1, limit: number = 20) {
    if (!user.coupleRoomId) {
      return {
        items: [],
        total: 0,
      };
    }

    const skip = (page - 1) * limit;

    const [actions, total] = await Promise.all([
      this.petActionModel
        .find({
          coupleId: user.coupleRoomId,
          type: 'image',
          imageUrl: { $exists: true, $ne: null },
        })
        .sort({ actionAt: -1 }) // Sort by actionAt (fallback to createdAt for old data)
        .skip(skip)
        .limit(limit)
        .select(
          'imageUrl userId actionAt takenAt baseExp bonusExp text mood createdAt',
        )
        .lean(),
      this.petActionModel.countDocuments({
        coupleId: user.coupleRoomId,
        type: 'image',
        imageUrl: { $exists: true, $ne: null },
      }),
    ]);

    const actionIds = actions.map(a => (a as any)._id);
    const reactions = await this.petReactionModel.find({ petActionId: { $in: actionIds } }).lean();

    const items = actions.map((action) => {
      const createdAt = (action as any).createdAt || new Date();
      const actionAt = action.actionAt || createdAt; // Fallback to createdAt for old data
      const actionIdStr = (action as any)._id.toString();

      const actionReactions = reactions.filter(r => r.petActionId.toString() === actionIdStr);
      const total_count = actionReactions.reduce((sum, r) => sum + r.count, 0);

      const groupedMap = new Map<string, number>();
      for (const r of actionReactions) {
        groupedMap.set(r.emoji, (groupedMap.get(r.emoji) || 0) + r.count);
      }

      const grouped = Array.from(groupedMap.entries()).map(([emoji, count]) => ({ emoji, count }));

      return {
        id: actionIdStr,
        imageUrl: action.imageUrl,
        userId: action.userId,
        actionAt, // Thời điểm logic
        takenAt: action.takenAt || null, // Thời điểm chụp (optional)
        baseExp: action.baseExp || 0, // Fallback to 0 for old data
        bonusExp: action.bonusExp || 0, // Fallback to 0 for old data
        text: action.text || null,
        mood: action.mood || null,
        createdAt, // Audit timestamp
        reactions: {
          total_count,
          grouped,
        },
      };
    });

    return {
      items,
      total,
    };
  }

  /**
   * POST /pet/images/:imageId/reactions
   * Send emoji reaction to an image
   */
  async sendReaction(user: any, petActionId: string, emoji: string, count: number) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    const action = await this.petActionModel.findOne({
      _id: petActionId,
      coupleId: user.coupleRoomId,
    }).lean();

    if (!action) {
      throw new NotFoundException('Pet action image not found');
    }

    const userId = user._id.toString();

    // Upsert logic for reaction
    await this.petReactionModel.findOneAndUpdate(
      { petActionId, userId, emoji },
      { $inc: { count } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Optional OneSignal Push Notification to partner if user is not the owner of the image
    if (action.userId.toString() !== userId && count > 0) {
      // Get partner info to send notification
      try {
        const partnerId = action.userId.toString();
        await this.notificationService.sendToUser(
          partnerId,
          '❤️ Người yêu của bạn vừa thả cảm xúc',
          'Vào xem ngay pet của cả hai đang làm gì!',
          {
            type: 'PET_REACTION',
            actionId: petActionId,
          }
        );
      } catch (error) {
        console.error('Error sending push notification for pet reaction:', error);
      }
    }

    return { success: true };
  }


  /**
   * GET /pet/scene
   * Get pet scene (background + objects + pet status)
   * Similar to home scene but with pet-specific background size (1242x2688)
   */
  async getPetScene(user: any) {
    // Get pet status
    const petData = await this.getPet(user);

    // Calculate todayFeedCount and lastFeedTime
    let todayFeedCount = 0;
    let lastFeedTime: string | null = null;

    if (user.coupleRoomId) {
      const { start, end } = this.getTodayDateRange();

      // Count today's image actions (feed actions)
      todayFeedCount = await this.petActionModel.countDocuments({
        coupleId: user.coupleRoomId,
        type: 'image',
        createdAt: { $gte: start, $lte: end },
      });

      // Get last feed time (last image action)
      const lastFeedAction = await this.petActionModel
        .findOne({
          coupleId: user.coupleRoomId,
          type: 'image',
        })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();

      if (lastFeedAction && (lastFeedAction as any).createdAt) {
        lastFeedTime = (lastFeedAction as any).createdAt.toISOString();
      }
    }

    // Pet background
    const background = {
      imageUrl:
        'https://res.cloudinary.com/dukoun1pb/image/upload/v1770517801/background_pet_ashg7f.png',
      width: 2048,
      height: 2048,
    };

    // Pet objects
    const objects = [
      {
        id: 'chari-pet',
        type: 'chari-pet',
        imageUrl:
          'https://res.cloudinary.com/dukoun1pb/image/upload/v1770517794/background_pet_ca%CC%81i_%C4%91e%CC%A3%CC%82m_cu%CC%89a_pet_j4w2g5.png',
        x: 900,
        y: 1350,
        width: 700,
        height: 700,
        zIndex: 9,
      },
      {
        id: 'pet',
        type: 'pet',
        imageUrl:
          'https://res.cloudinary.com/dukoun1pb/image/upload/v1770517831/pet_level_1_aav3jk.png',
        x: 780,
        y: 925,
        width: 900,
        height: 900,
        zIndex: 11,
      },
    ];

    // Format pet status
    const petStatus = {
      level: petData.level,
      exp: petData.exp,
      expToNextLevel: petData.nextLevelExp,
      todayFeedCount,
      lastFeedTime: lastFeedTime || null,
    };

    return {
      background,
      objects,
      petStatus,
    };
  }

  async sendVoice(
    user: any,
    audioUrl: string,
    duration: number,
    takenAt?: string,
    text?: string,
    mood?: string,
  ) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    if (!audioUrl.startsWith('http')) {
      throw new BadRequestException('Invalid audio url');
    }

    if (duration <= 0 || duration > 60) {
      throw new BadRequestException('Duration must be between 1 and 60 seconds');
    }

    const pet = await this.getPetForCouple(user.coupleRoomId);
    const userId = user._id.toString();
    const now = new Date();

    const cleanedMood = PET_IMAGE_MOODS.includes(mood as PetImageMood)
      ? (mood as PetImageMood)
      : null;

    const partnerAction = await this.checkPartnerVoiceInLast3Hours(
      user.coupleRoomId,
      userId,
    );

    const baseExp = this.VOICE_EXP;
    const bonusExp = partnerAction ? this.VOICE_BONUS : 0;
    const totalExp = baseExp + bonusExp;

    let takenAtDate: Date | undefined = undefined;
    if (takenAt) {
      takenAtDate = new Date(takenAt);
      if (takenAtDate > now) {
        takenAtDate = now;
      }
    }

    const actionAt = now;
    const savedAction = await this.petActionModel.create({
      coupleId: user.coupleRoomId,
      userId,
      type: 'voice',
      audioUrl,
      duration,
      actionAt,
      takenAt: takenAtDate,
      baseExp,
      bonusExp,
      text,
      mood: cleanedMood,
    });

    const leveledUp = this.applyExp(pet, totalExp);
    await this.streakService.recordInteraction(userId, user.coupleRoomId);
    await this.notificationService.sendInteractionPush(userId);
    await pet.save();

    this.eventsGateway.emitToCoupleRoom(
      user.coupleRoomId,
      'pet:voice_consumed',
      {
        petId: pet._id.toString(),
        actionId: savedAction._id.toString(),
        audioUrl,
        duration,
        fromUserId: userId,
        expAdded: totalExp,
        baseExp,
        bonusExp,
        leveledUp,
        pet: {
          level: pet.level,
          currentExp: pet.experience,
        },
        actionAt: actionAt.toISOString(),
        mood: cleanedMood || null,
        text: text || null,
      },
    );

    return {
      expAdded: totalExp,
      bonus: bonusExp,
      levelUp: leveledUp,
      actionId: savedAction._id.toString(),
    };
  }

  async getVoices(user: any, page: number = 1, limit: number = 20) {
    if (!user.coupleRoomId) {
      return {
        items: [],
        total: 0,
      };
    }

    const skip = (page - 1) * limit;

    const [actions, total] = await Promise.all([
      this.petActionModel
        .find({
          coupleId: user.coupleRoomId,
          type: 'voice',
          audioUrl: { $exists: true, $ne: null },
        })
        .sort({ actionAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'audioUrl duration userId actionAt takenAt baseExp bonusExp text mood createdAt isPinned pinnedAt',
        )
        .lean(),
      this.petActionModel.countDocuments({
        coupleId: user.coupleRoomId,
        type: 'voice',
        audioUrl: { $exists: true, $ne: null },
      }),
    ]);

    const items = actions.map((action) => {
      const createdAt = (action as any).createdAt || new Date();
      const actionAt = action.actionAt || createdAt;

      return {
        id: (action as any)._id.toString(),
        audioUrl: action.audioUrl,
        duration: action.duration || 0,
        userId: action.userId,
        actionAt,
        takenAt: action.takenAt || null,
        baseExp: action.baseExp || 0,
        bonusExp: action.bonusExp || 0,
        text: action.text || null,
        mood: action.mood || null,
        createdAt,
        isPinned: (action as any).isPinned || false,
      };
    });

    return {
      items,
      total,
    };
  }

  async getPinnedVoice(user: any) {
    if (!user.coupleRoomId) {
      return null;
    }

    const pinnedVoice = await this.petActionModel
      .findOne({
        coupleId: user.coupleRoomId,
        type: 'voice',
        isPinned: true,
      })
      .lean();

    if (!pinnedVoice) {
      return null;
    }

    const createdAt = (pinnedVoice as any).createdAt || new Date();

    return {
      id: (pinnedVoice as any)._id.toString(),
      audioUrl: pinnedVoice.audioUrl,
      duration: pinnedVoice.duration || 0,
      userId: pinnedVoice.userId,
      actionAt: pinnedVoice.actionAt || createdAt,
      takenAt: pinnedVoice.takenAt || null,
      baseExp: pinnedVoice.baseExp || 0,
      bonusExp: pinnedVoice.bonusExp || 0,
      text: pinnedVoice.text || null,
      mood: pinnedVoice.mood || null,
      createdAt,
      isPinned: true,
    };
  }

  async togglePinVoice(user: any, voiceId: string) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    const voice = await this.petActionModel.findOne({
      _id: voiceId,
      coupleId: user.coupleRoomId,
      type: 'voice',
    });

    if (!voice) {
      throw new NotFoundException('Voice not found');
    }

    const isCurrentlyPinned = (voice as any).isPinned || false;

    const session = await this.petActionModel.db.startSession();
    try {
      session.startTransaction();

      if (isCurrentlyPinned) {
        await this.petActionModel.updateOne(
          { _id: voiceId },
          { $set: { isPinned: false, pinnedAt: null } },
          { session },
        );

        await session.commitTransaction();

        this.eventsGateway.emitToCoupleRoom(
          user.coupleRoomId,
          'voices:unpinned',
          { voiceId },
        );

        return {
          success: true,
          voiceId,
          isPinned: false,
        };
      }

      await this.petActionModel.updateMany(
        {
          coupleId: user.coupleRoomId,
          type: 'voice',
          isPinned: true,
        },
        { $set: { isPinned: false, pinnedAt: null } },
        { session },
      );

      const now = new Date();
      await this.petActionModel.updateOne(
        { _id: voiceId },
        { $set: { isPinned: true, pinnedAt: now } },
        { session },
      );

      await session.commitTransaction();

      const updatedVoice = await this.petActionModel.findById(voiceId).lean();
      const createdAt = (updatedVoice as any).createdAt || new Date();

      this.eventsGateway.emitToCoupleRoom(
        user.coupleRoomId,
        'voices:pinned',
        {
          id: (updatedVoice as any)._id.toString(),
          audioUrl: updatedVoice?.audioUrl,
          duration: updatedVoice?.duration || 0,
          userId: updatedVoice?.userId,
          actionAt: updatedVoice?.actionAt || createdAt,
          takenAt: updatedVoice?.takenAt || null,
          baseExp: updatedVoice?.baseExp || 0,
          bonusExp: updatedVoice?.bonusExp || 0,
          text: updatedVoice?.text || null,
          mood: updatedVoice?.mood || null,
          createdAt,
          isPinned: true,
        },
      );

      return {
        success: true,
        voiceId,
        isPinned: true,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteVoice(user: any, voiceId: string) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    const voice = await this.petActionModel.findOne({
      _id: voiceId,
      coupleId: user.coupleRoomId,
      type: 'voice',
    });

    if (!voice) {
      throw new NotFoundException('Voice not found');
    }

    const wasPinned = (voice as any).isPinned;

    if (wasPinned) {
      this.eventsGateway.emitToCoupleRoom(
        user.coupleRoomId,
        'voices:unpinned',
        {
          voiceId: voice._id.toString(),
        },
      );
    }

    await this.petActionModel.deleteOne({ _id: voiceId });

    if (voice.audioUrl) {
      try {
        const urlParts = voice.audioUrl.split('/');
        const uploadIndex = urlParts.findIndex((part) => part === 'upload');
        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
          const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
          await this.cloudinaryService.deleteFile(publicId);
        }
      } catch (error) {
      }
    }

    this.eventsGateway.emitToCoupleRoom(
      user.coupleRoomId,
      'voices:deleted',
      {
        voiceId: voice._id.toString(),
      },
    );

    return {
      success: true,
    };
  }

  /**
   * Get streak leaderboard
   * Top 50 couples with highest streak
   */
  async getStreakLeaderboard(user: any) {
    // 1. Get top 50 streaks
    const topStreaks = await this.streakModel
      .find({})
      .sort({ currentDays: -1, lastCountedDate: -1 })
      .limit(50)
      .lean();

    if (topStreaks.length === 0) {
      return {
        myRank: 0,
        myStreak: 0,
        items: [],
      };
    }

    // 2. Get couple info and pet levels for these streaks
    const coupleIds = topStreaks.map((s) => s.coupleId);
    const [couplesInfo, pets] = await Promise.all([
      this.coupleService.getCouplesBatchInfo(coupleIds),
      this.petModel.find({ coupleId: { $in: coupleIds } }).lean()
    ]);

    const petMap = new Map();
    pets.forEach(p => petMap.set(p.coupleId, p));

    // 3. Map to DTO
    const items = topStreaks.map((streak, index) => {
      const info = couplesInfo.get(streak.coupleId);
      const pet = petMap.get(streak.coupleId);
      return {
        coupleId: streak.coupleId,
        members: info?.members || [],
        pet: {
          level: pet?.level || 1,
        },
        backgroundUrl: info?.backgroundUrl || 'https://res.cloudinary.com/dukoun1pb/image/upload/v1768313007/back_ground_pet_1_m6frgf.png',
        streak: streak.currentDays || 0,
        loveDays: info?.daysInLove || 0,
        rank: index + 1,
      };
    });

    // 4. Get my rank and streak (if user has couple)
    let myRank = 0;
    let myStreak = 0;

    if (user.coupleRoomId) {
      const streakData = await this.streakService.getStreak(user.coupleRoomId);
      myStreak = streakData.days;

      if (myStreak > 0) {
        const betterCount = await this.streakModel.countDocuments({
          currentDays: { $gt: myStreak },
        });
        myRank = betterCount + 1;

        const inTopListIndex = items.findIndex(
          (item) => item.coupleId === user.coupleRoomId,
        );
        if (inTopListIndex !== -1) {
          myRank = items[inTopListIndex].rank;
        }
      }
    }

    return {
      myRank,
      myStreak,
      items,
    };
  }
}
