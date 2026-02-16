import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { OnboardDto } from './dto/onboard.dto';
import { calculateZodiac } from '../../shared/utils/zodiac.util';
import { EventsGateway } from '../events/events.gateway';
import { NotificationService } from '../notification/notification.service';
import { DeviceService } from '../device/device.service';

/**
 * User Service
 * Handles user profile operations
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(CoupleRoom.name) private coupleRoomModel: Model<CoupleRoomDocument>,
    private eventsGateway: EventsGateway,
    private notificationService: NotificationService,
    private deviceService: DeviceService,
  ) { }

  /**
   * Get user profile with couple and roomState info (GET /me)
   * Returns complete user data including couple room state
   */
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const response: any = {
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        nickname: user.nickname, // Dùng nickname thay vì displayName trong app
        avatarUrl: user.avatarUrl,
        birthDate: user.birthDate,
        gender: user.gender,
        zodiac: user.zodiac,
        mode: user.mode,
        coupleCode: user.coupleCode,
        partnerId: user.partnerId,
        coupleRoomId: user.coupleRoomId,
        coins: user.coins,
        provider: user.provider,
        isOnboarded: user.isOnboarded || false, // Thêm flag này
      },
    };

    // If user is in couple mode, include couple and roomState
    if (user.mode === 'couple' && user.coupleRoomId) {
      const coupleRoom = await this.coupleRoomModel.findById(user.coupleRoomId);

      if (coupleRoom) {
        // Get partner info
        const partner = await this.userModel.findById(user.partnerId);

        response.couple = {
          coupleRoomId: coupleRoom._id,
          code: coupleRoom.code,
          startDate: coupleRoom.startDate,
          partners: [
            {
              id: user._id,
              nickname: user.nickname || user.displayName, // Ưu tiên nickname
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              gender: user.gender,
            },
            partner ? {
              id: partner._id,
              nickname: partner.nickname || partner.displayName, // Ưu tiên nickname
              displayName: partner.displayName,
              avatarUrl: partner.avatarUrl,
              gender: partner.gender,
            } : null,
          ].filter(Boolean),
        };

        response.roomState = coupleRoom.roomState;
      }
    }

    return response;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateUserDto },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      gender: user.gender,
      zodiac: user.zodiac,
      mode: user.mode,
      coupleCode: user.coupleCode,
      partnerId: user.partnerId,
      coupleRoomId: user.coupleRoomId,
      coins: user.coins,
      isOnboarded: user.isOnboarded || false,
    };
  }

  /**
   * Add coins to user
   */
  async addCoins(userId: string, amount: number) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $inc: { coins: amount } },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user's couple room ID
   */
  async updateCoupleRoom(userId: string, coupleRoomId: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { coupleRoomId, mode: 'couple' },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Complete user onboarding
   * Sets nickname, gender, birthDate, zodiac, và isOnboarded = true
   */
  async onboard(userId: string, onboardDto: OnboardDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isOnboarded) {
      throw new BadRequestException('User already onboarded');
    }

    // Calculate zodiac từ birthDate
    const zodiac = calculateZodiac(new Date(onboardDto.birthDate));

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        nickname: onboardDto.nickname,
        gender: onboardDto.gender,
        birthDate: new Date(onboardDto.birthDate),
        zodiac: zodiac,
        isOnboarded: true,
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      id: updatedUser._id,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      gender: updatedUser.gender,
      birthDate: updatedUser.birthDate,
      zodiac: updatedUser.zodiac,
      isOnboarded: updatedUser.isOnboarded,
    };
  }

  /**
   * Delete user account
   * Xóa toàn bộ thông tin user, bao gồm cả hủy ghép đôi nếu đang ở couple mode
   */
  async deleteAccount(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Nếu user đang ở couple mode, cần hủy ghép đôi trước
    if (user.mode === 'couple' && user.partnerId && user.coupleRoomId) {
      const partnerId = user.partnerId;
      const coupleRoomId = user.coupleRoomId;

      // Lấy thông tin partner trước khi xóa
      const partner = await this.userModel.findById(partnerId);

      // Xóa CoupleRoom
      await this.coupleRoomModel.findByIdAndDelete(coupleRoomId);

      // Reset partner về solo mode (nếu partner còn tồn tại)
      if (partner) {
        await this.userModel.findByIdAndUpdate(partnerId, {
          mode: 'solo',
          partnerId: null,
          coupleRoomId: null,
          coupleCode: null,
          coupleCodeExpiresAt: null,
        });

        // Emit event để thông báo partner về việc account bị xóa
        const accountDeletedEvent = {
          message: 'Your partner has deleted their account',
          timestamp: new Date(),
          coupleRoomId: coupleRoomId,
        };

        this.eventsGateway.emitToUser(partnerId, 'partnerAccountDeleted', accountDeletedEvent);
        this.eventsGateway.emitToCoupleRoom(coupleRoomId, 'coupleRoomDeleted', {
          message: 'Couple room has been deleted due to account deletion',
          timestamp: new Date(),
        });
      }

      this.logger.log(
        `User ${userId} deleted account, couple room ${coupleRoomId} removed, partner ${partnerId} reset to solo mode`,
      );
    }

    // Xóa user
    await this.userModel.findByIdAndDelete(userId);
    await this.deviceService.cleanupUserDevices(userId);

    this.logger.log(`User account ${userId} deleted successfully`);

    return {
      message: 'Account deleted successfully',
      success: true,
    };
  }

  /**
   * Ping / Heartbeat from app
   * Updates lastActiveAt and onesignalPlayerId
   */
  async ping(userId: string, onesignalPlayerId?: string) {
    const update: any = { lastActiveAt: new Date() };
    if (onesignalPlayerId) {
      update.onesignalPlayerId = onesignalPlayerId;
    }

    const user = await this.userModel.findByIdAndUpdate(userId, { $set: update }, { new: true });

    // Check and push "Partner open app"
    if (user && user.partnerId) {
      await this.notificationService.sendPartnerOpen(userId);
    }

    return { success: true };
  }
}

