import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CoupleRoom, CoupleRoomDocument } from '../couple/schemas/couple-room.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { OnboardDto } from './dto/onboard.dto';
import { calculateZodiac } from '../../shared/utils/zodiac.util';

/**
 * User Service
 * Handles user profile operations
 */
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(CoupleRoom.name) private coupleRoomModel: Model<CoupleRoomDocument>,
  ) {}

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
}

