import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { PetAction, PetActionDocument } from './schemas/pet-action.schema';
import { AlbumService } from '../album/album.service';
import { CoupleService } from '../couple/couple.service';

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
  private readonly RECENT_IMAGES_LIMIT = 5;

  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetAction.name)
    private petActionModel: Model<PetActionDocument>,
    private albumService: AlbumService,
    private coupleService: CoupleService,
  ) {}

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
      };
    }

    const pet = await this.getPetForCouple(user.coupleRoomId);
    const nextLevelExp =
      this.EXP_PER_LEVEL - (pet.experience % this.EXP_PER_LEVEL);

    // Get recent images (last 5)
    const recentActions = await this.petActionModel
      .find({
        coupleId: user.coupleRoomId,
        type: 'image',
        imageUrl: { $exists: true, $ne: null },
      })
      .sort({ createdAt: -1 })
      .limit(this.RECENT_IMAGES_LIMIT)
      .select('imageUrl userId createdAt')
      .lean();

    const recentImages = recentActions.map((action) => ({
      url: action.imageUrl,
      createdAt: (action as any).createdAt || new Date(),
      userId: action.userId,
    }));

    return {
      level: pet.level,
      exp: pet.experience,
      nextLevelExp,
      recentImages,
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
   * Send image to pet
   * 
   * Note: Backend does NOT check 3-hour cooldown - UI handles this.
   * Users can send any image URL (no content validation).
   * The 3-hour limit is enforced by UI only for better UX.
   */
  async sendImage(user: any, imageUrl: string) {
    if (!user.coupleRoomId) {
      throw new BadRequestException('No couple found');
    }

    // Only validate URL format, not content or cooldown
    if (!imageUrl.startsWith('http')) {
      throw new BadRequestException('Invalid image url');
    }

    const pet = await this.getPetForCouple(user.coupleRoomId);
    const userId = user._id.toString();

    // Log action
    await this.petActionModel.create({
      coupleId: user.coupleRoomId,
      userId,
      type: 'image',
      imageUrl,
    });

    // Also save to album (shared album)
    await this.albumService.addPhoto(user, imageUrl);

    // Calculate EXP
    let expGained = this.IMAGE_EXP;
    let bonus = 0;

    // Check bonus (both users sent image today)
    const bothSentImage = await this.checkBothUsersDidActionToday(
      user.coupleRoomId,
      userId,
      'image',
    );

    if (bothSentImage) {
      bonus = this.IMAGE_BONUS;
      expGained += bonus;
    }

    // Apply EXP and check level up
    const leveledUp = this.applyExp(pet, expGained);
    await pet.save();

    return {
      expAdded: expGained,
      bonus,
      levelUp: leveledUp,
    };
  }

  /**
   * GET /pet/images
   * Get pet images gallery with pagination
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('imageUrl userId createdAt')
        .lean(),
      this.petActionModel.countDocuments({
        coupleId: user.coupleRoomId,
        type: 'image',
        imageUrl: { $exists: true, $ne: null },
      }),
    ]);

    const items = actions.map((action) => ({
      imageUrl: action.imageUrl,
      createdAt: (action as any).createdAt || new Date(),
      userId: action.userId,
    }));

    return {
      items,
      total,
    };
  }
}
