import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FridgeService } from './fridge.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { CreateNoteDto } from './dto/create-note.dto';

/**
 * Fridge Controller
 * Handles Home - Fridge endpoints
 */
@ApiTags('Fridge')
@Controller('fridge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  /**
   * GET /fridge/home
   * Get fridge home data (background + 2 latest notes)
   */
  @Get('home')
  @ApiOperation({
    summary: 'Get fridge home data',
    description:
      'Returns fridge background and 2 latest notes. ' +
      'Only available for users in a couple.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fridge home data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        background: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string' },
            aspectRatio: { type: 'string', example: '9:16' },
          },
        },
        notes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              frameImageUrl: { type: 'string' },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
              },
              rotation: { type: 'number' },
              zIndex: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User is not in a couple',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getFridgeHome(@CurrentUser() user: any) {
    return this.fridgeService.getFridgeHome(user);
  }

  /**
   * POST /fridge/note
   * Create a new fridge note
   */
  @Post('note')
  @ApiOperation({
    summary: 'Create a new fridge note',
    description:
      'Creates a new note on the fridge. ' +
      'Backend auto-generates frameImageUrl, rotation, and position. ' +
      'Emits realtime event to couple room.',
  })
  @ApiResponse({
    status: 201,
    description: 'Note created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User is not in a couple or invalid content',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createNote(
    @CurrentUser() user: any,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.fridgeService.createNote(user, createNoteDto.content);
  }
}

