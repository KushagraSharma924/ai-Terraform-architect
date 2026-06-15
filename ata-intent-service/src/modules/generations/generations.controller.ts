import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GenerationsService } from './generations.service';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { RefineGenerationDto } from './dto/refine-generation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Post('generations')
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGenerationDto,
  ) {
    return this.generationsService.create(userId, dto);
  }

  @Get('generations/:id')
  findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.generationsService.findById(userId, id);
  }

  @Get('generations/:id/status')
  getStatus(@Param('id') id: string) {
    return this.generationsService.getStatus(id);
  }

  @Get('projects/:projectId/generations')
  findByProject(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.generationsService.findByProject(userId, projectId, page || 1, limit || 20);
  }

  @Post('generations/:id/refine')
  @HttpCode(HttpStatus.ACCEPTED)
  refine(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RefineGenerationDto,
  ) {
    return this.generationsService.refine(userId, id, dto);
  }

  @Delete('generations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.generationsService.delete(userId, id);
  }
}
