import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CoupleService } from './couple.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { PairCoupleDto } from './dto/pair-couple.dto';
import { SetLoveDateDto } from './dto/set-love-date.dto';

/**
 * Couple Controller
 * Handles couple endpoints (code, pair, info, love date)
 */
@ApiTags('Couple')
@Controller('couple')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  /**
   * POST /couple/create-code
   * Generate couple code for current user
   */
  @Post('create-code')
  @ApiOperation({ summary: 'Generate couple code for pairing' })
  @ApiResponse({
    status: 200,
    description: 'Couple code generated',
    schema: {
      type: 'object',
      properties: {
        coupleCode: { type: 'string', example: 'XY3H56' },
        expiresAt: { type: 'string', format: 'date-time' },
        message: { type: 'string' },
      },
    },
  })
  async createCode(@CurrentUser() user: any) {
    return this.coupleService.generateCoupleCode(user._id);
  }

  /**
   * POST /couple/pair
   * Pair with partner using couple code
   */
  @Post('pair')
  @ApiOperation({ summary: 'Pair with partner using couple code' })
  @ApiResponse({
    status: 200,
    description: 'Successfully paired',
    schema: {
      type: 'object',
      properties: {
        coupleId: { type: 'string', example: 'c_88991' },
        partner: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            displayName: { type: 'string' },
            avatarUrl: { type: 'string' },
            gender: { type: 'string' },
            birthDate: { type: 'string' },
          },
        },
      },
    },
  })
  async pair(@CurrentUser() user: any, @Body() pairDto: PairCoupleDto) {
    return this.coupleService.joinCoupleByCode(user._id, pairDto.code);
  }

  /**
   * GET /couple/info
   * Get couple info
   */
  @Get('info')
  @ApiOperation({ summary: 'Get couple information' })
  @ApiResponse({
    status: 200,
    description: 'Couple information',
  })
  async getRoomInfo(@CurrentUser() user: any) {
    if (!user.coupleRoomId) {
      return { message: 'You are not in a couple room' };
    }
    return this.coupleService.getRoomInfo(user.coupleRoomId);
  }

  /**
   * POST /couple/set-love-date
   * Set the love start date
   */
  @Post('set-love-date')
  @ApiOperation({ summary: 'Set love start date' })
  @ApiResponse({
    status: 200,
    description: 'Love date set successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  async setLoveDate(
    @CurrentUser() user: any,
    @Body() setLoveDateDto: SetLoveDateDto,
  ) {
    return this.coupleService.setLoveDate(user.coupleRoomId, setLoveDateDto.date);
  }

  /**
   * GET /couple/love
   * Get love start date and days together
   */
  @Get('love')
  @ApiOperation({ summary: 'Get love date and days together' })
  @ApiResponse({
    status: 200,
    description: 'Love information',
    schema: {
      type: 'object',
      properties: {
        loveStartDate: { type: 'string', example: '2024-02-14' },
        daysTogether: { type: 'number', example: 123 },
      },
    },
  })
  async love(@CurrentUser() user: any) {
    return this.coupleService.getLoveInfo(user.coupleRoomId);
  }

  /**
   * GET /couple/single
   * Get single home data (when not in couple mode)
   */
  @Get('single')
  @ApiOperation({ summary: 'Get single home data' })
  @ApiResponse({
    status: 200,
    description: 'Single home data',
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', example: 'single' },
        isCouple: { type: 'boolean', example: false },
        myCode: { type: 'string', example: 'ABC123' },
        codeExpiresAt: { type: 'string', format: 'date-time' },
        expiresInMinutes: { type: 'number', example: 2880 },
        partner: { type: 'null' },
        ui: {
          type: 'object',
          properties: {
            step: {
              type: 'string',
              enum: ['no_code', 'waiting_partner', 'code_expired'],
            },
            canShare: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  async getSingleHome(@CurrentUser() user: any) {
    return this.coupleService.getSingleHome(user._id);
  }

  /**
   * POST /couple/break-up
   * Leave couple / Break up
   */
  @Post('break-up')
  @ApiOperation({ summary: 'Leave couple / Break up' })
  @ApiResponse({
    status: 200,
    description: 'Successfully left couple',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Not in a couple' })
  async breakUp(@CurrentUser() user: any) {
    return this.coupleService.breakUp(user._id);
  }
}

