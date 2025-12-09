import { Controller, Get, Post, UseGuards, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PetService } from './pet.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { SendImageDto } from './dto/send-image.dto';
import {
  PetStatusResponseDto,
  PettingResponseDto,
  SendImageResponseDto,
  PetImagesResponseDto,
  PetSceneResponseDto,
} from './dto/pet-response.dto';

/**
 * Pet Controller
 * Handles pet-related endpoints
 */
@ApiTags('Pet')
@Controller('pet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PetController {
  constructor(private readonly petService: PetService) {}

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
      'Bonus: +20 EXP if both users sent image today (same UTC day). ' +
      'Image is saved to both PetAction history and shared Album. ' +
      'No cooldown check - backend always accepts. UI should handle 3-hour cooldown display.',
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
    return this.petService.sendImage(user, sendImageDto.imageUrl);
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

  /**
   * GET /pet/scene
   * Get pet scene (background + objects + pet status)
   * Similar to /home but optimized for pet screen (1242x2688)
   */
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
}

