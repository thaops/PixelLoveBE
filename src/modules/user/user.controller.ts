import { Controller, Get, Put, Post, Delete, Body, UseGuards, Param, ForbiddenException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { OnboardDto } from './dto/onboard.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

/**
 * User Controller
 * Handles user profile endpoints
 */
@ApiTags('User')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users/me
   * Get current user profile
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return this.userService.getProfile(user._id);
  }

  /**
   * POST /users/onboard
   * Complete user onboarding (nickname, gender, birthDate)
   */
  @Post('onboard')
  @ApiOperation({ summary: 'Complete user onboarding' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        nickname: { type: 'string' },
        gender: { type: 'string' },
        birthDate: { type: 'string' },
        zodiac: { type: 'string' },
        isOnboarded: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'User already onboarded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async onboard(
    @CurrentUser() user: any,
    @Body() onboardDto: OnboardDto,
  ) {
    return this.userService.onboard(user._id, onboardDto);
  }

  /**
   * PUT /users/{userId}
   * Update current user profile
   */
  @Put(':userId')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot update other user' })
  async updateProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (userId !== user._id.toString()) {
      throw new ForbiddenException('Cannot update other user');
    }
    await this.userService.updateProfile(user._id, updateUserDto);
    return { success: true };
  }

  /**
   * DELETE /users/{userId}
   * Delete user account (xóa toàn bộ thông tin kể cả hủy ghép đôi)
   * 
   * Khi xóa tài khoản:
   * - Nếu user đang ở couple mode: tự động hủy ghép đôi, xóa CoupleRoom, reset partner về solo mode
   * - Xóa toàn bộ thông tin user khỏi database
   * - Emit WebSocket event để thông báo partner (nếu có)
   */
  @Delete(':userId')
  @ApiOperation({ 
    summary: 'Delete user account',
    description: 'Xóa tài khoản user và toàn bộ thông tin liên quan. Nếu user đang ở couple mode, sẽ tự động hủy ghép đôi và reset partner về solo mode.',
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID của tài khoản cần xóa (phải là ID của chính user đang đăng nhập)',
    example: 'u_12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Tài khoản đã được xóa thành công',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Account deleted successfully',
          description: 'Thông báo xóa tài khoản thành công',
        },
        success: { 
          type: 'boolean', 
          example: true,
          description: 'Trạng thái thành công',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Không thể xóa tài khoản của user khác. Chỉ có thể xóa tài khoản của chính mình.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Not Found - Không tìm thấy user với ID được cung cấp',
  })
  async deleteAccount(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    if (userId !== user._id.toString()) {
      throw new ForbiddenException('Cannot delete other user account');
    }
    return this.userService.deleteAccount(user._id);
  }
}

