import { Controller, Get, Post, Delete, UseGuards, Body, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PetService } from './pet.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { SendImageDto } from './dto/send-image.dto';
import { SendVoiceDto } from './dto/send-voice.dto';
import { PinVoiceDto } from './dto/pin-voice.dto';
import {
  PetStatusResponseDto,
  PettingResponseDto,
  SendImageResponseDto,
  SendVoiceResponseDto,
  PetImagesResponseDto,
  PetVoicesResponseDto,
  PetSceneResponseDto,
  TogglePinVoiceResponseDto,
  DeleteVoiceResponseDto,
} from './dto/pet-response.dto';
import { LeaderboardStreakResponseDto } from './dto/leaderboard-streak.dto';

/**
 * Pet Controller
 * Handles pet-related endpoints
 */
@ApiTags('Pet')
@Controller('pet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PetController {
  constructor(private readonly petService: PetService) { }

  /**
   * GET /pet
   * Get pet status with recent images
   */
  @Get()
  @ApiOperation({
    summary: 'Get pet status with recent images',
    description:
      'Returns current pet level, experience, and the 5 most recent images. ' +
      'If user is not in a couple, returns default values (level 1, exp 0).',
  })
  @ApiResponse({
    status: 200,
    description: 'Pet status retrieved successfully',
    type: PetStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getPet(@CurrentUser() user: any) {
    return this.petService.getPet(user);
  }

  /**
   * POST /pet/petting
   * Pet the pet (vuốt pet)
   */
  @Post('petting')
  @ApiOperation({
    summary: 'Pet the pet (vuốt pet)',
    description:
      'Pet the pet to gain EXP. Base: 5 EXP. ' +
      'Bonus: +5 EXP if both users petted today (same UTC day). ' +
      'No cooldown check - backend always accepts. UI should handle cooldown display.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pet petted successfully',
    type: PettingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User is not in a couple',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async petting(@CurrentUser() user: any) {
    return this.petService.petting(user);
  }

  /**
   * POST /pet/image
   * Send image to pet
   * 
   * Note: Backend accepts all requests - no 3-hour cooldown check.
   * UI should handle cooldown display/enforcement for better UX.
   */
  @Post('image')
  @ApiOperation({
    summary: 'Send image to pet',
    description:
      'Send an image to pet to gain EXP. Base: 20 EXP. ' +
      'Bonus: +20 EXP if partner sent image within last 3 hours. ' +
      'Image is saved to both PetAction history and shared Album.',
  })
  @ApiResponse({
    status: 200,
    description: 'Image sent successfully',
    type: SendImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - User is not in a couple or invalid image URL format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async sendImage(
    @CurrentUser() user: any,
    @Body() sendImageDto: SendImageDto,
  ) {
    return this.petService.sendImage(
      user,
      sendImageDto.imageUrl,
      sendImageDto.takenAt,
      sendImageDto.text,
      sendImageDto.mood,
    );
  }

  /**
   * GET /pet/images
   * Get pet images gallery with pagination
   */
  @Get('images')
  @ApiOperation({
    summary: 'Get pet images gallery',
    description:
      'Get paginated list of all images sent to pet. ' +
      'Sorted by creation date (newest first). ' +
      'If user is not in a couple, returns empty array.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Number of items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Images retrieved successfully',
    type: PetImagesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getImages(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.petService.getImages(user, pageNum, limitNum);
  }

  @Post('voice')
  @ApiOperation({
    summary: 'Send voice message to pet',
    description:
      'Send a voice message to pet to gain EXP. Base: 15 EXP. ' +
      'Bonus: +15 EXP if partner sent voice within last 3 hours. ' +
      'Voice is saved to PetAction history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Voice sent successfully',
    type: SendVoiceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - User is not in a couple or invalid audio URL/duration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async sendVoice(
    @CurrentUser() user: any,
    @Body() sendVoiceDto: SendVoiceDto,
  ) {
    return this.petService.sendVoice(
      user,
      sendVoiceDto.audioUrl,
      sendVoiceDto.duration,
      sendVoiceDto.takenAt,
      sendVoiceDto.text,
      sendVoiceDto.mood,
    );
  }

  @Get('voices')
  @ApiOperation({
    summary: 'Get pet voice messages gallery',
    description:
      'Get paginated list of all voice messages sent to pet. ' +
      'Sorted by creation date (newest first). ' +
      'If user is not in a couple, returns empty array.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (starts from 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Number of items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Voice messages retrieved successfully',
    type: PetVoicesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getVoices(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.petService.getVoices(user, pageNum, limitNum);
  }

  @Get('scene')
  @ApiOperation({
    summary: 'Get pet scene',
    description:
      'Returns pet scene with background (1242x2688), pet object position, and pet status. ' +
      'Similar to /home endpoint but optimized for vertical pet screen display.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pet scene retrieved successfully',
    type: PetSceneResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getPetScene(@CurrentUser() user: any) {
    return this.petService.getPetScene(user);
  }

  @Get('voices/pinned')
  @ApiOperation({
    summary: 'Get pinned voice',
    description: 'Get the currently pinned voice message. Returns null if no voice is pinned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pinned voice retrieved successfully (or null if none)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getPinnedVoice(@CurrentUser() user: any) {
    return this.petService.getPinnedVoice(user);
  }

  @Post('voices/pin')
  @ApiOperation({
    summary: 'Toggle pin voice message',
    description: 'Toggle pin state of a voice message. If voice is not pinned, it will be pinned (and unpin any previously pinned voice). If voice is already pinned, it will be unpinned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Voice pin state toggled successfully',
    type: TogglePinVoiceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User is not in a couple',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Voice does not exist',
  })
  async togglePinVoice(
    @CurrentUser() user: any,
    @Body() pinVoiceDto: PinVoiceDto,
  ) {
    return this.petService.togglePinVoice(user, pinVoiceDto.voiceId);
  }

  @Delete('voices/:voiceId')
  @ApiOperation({
    summary: 'Delete a voice message',
    description: 'Delete a voice message. If the voice is pinned, it will be unpinned first. Also deletes the file from Cloudinary.',
  })
  @ApiParam({
    name: 'voiceId',
    description: 'Voice ID to delete',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Voice deleted successfully',
    type: DeleteVoiceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User is not in a couple',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Voice does not exist',
  })
  async deleteVoice(
    @CurrentUser() user: any,
    @Param('voiceId') voiceId: string,
  ) {
    return this.petService.deleteVoice(user, voiceId);
  }

  @Get('leaderboard/streak')
  @ApiOperation({
    summary: 'Get streak leaderboard',
    description: 'Get top 50 couples with highest streak and my rank',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    type: LeaderboardStreakResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStreakLeaderboard(@CurrentUser() user: any) {
    return this.petService.getStreakLeaderboard(user);
  }
}
