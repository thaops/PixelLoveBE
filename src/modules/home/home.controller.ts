import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HomeService } from './home.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

/**
 * Home Controller
 * GET /home - Returns couple's virtual home scene
 */
@ApiTags('Home')
@Controller('home')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * GET /home
   * Get the couple's home scene (background + objects + pet status)
   */
  @Get()
  @ApiOperation({ summary: 'Get virtual home scene' })
  @ApiResponse({
    status: 200,
    description: 'Home scene retrieved',
    schema: {
      type: 'object',
      properties: {
        background: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string' },
            width: { type: 'number', example: 4096 },
            height: { type: 'number', example: 1920 },
          },
        },
        objects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              imageUrl: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
              zIndex: { type: 'number' },
            },
          },
        },
        petStatus: {
          type: 'object',
          properties: {
            level: { type: 'number' },
            exp: { type: 'number' },
            expToNextLevel: { type: 'number' },
            todayFeedCount: { type: 'number' },
            lastFeedTime: { type: 'string' },
          },
        },
      },
    },
  })
  async getHome(@CurrentUser() user: any) {
    return this.homeService.getHomeScene(user);
  }
}

