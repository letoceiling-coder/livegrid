import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { ModerationActionDto, QueryModerationQueueDto } from './dto/listings-moderation.dto';
import { ListingsModerationService } from './listings-moderation.service';

@ApiTags('Admin / Moderation')
@ApiBearerAuth()
@Controller('admin/moderation')
export class ListingsModerationController {
  constructor(private readonly moderation: ListingsModerationService) {}

  @Get('stats')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Метрики очереди модерации (DEV/debug)' })
  stats(@CurrentUser('role') role: string) {
    return this.moderation.getStats();
  }

  @Get('listings')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Очередь модерации объявлений' })
  queue(@Query() query: QueryModerationQueueDto, @CurrentUser('sub') userId: string, @CurrentUser('role') role: string) {
    return this.moderation.getQueue(query, { userId, role });
  }

  @Get('listings/:id/review')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Пакет для review center (live vs pending + diff)' })
  review(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.moderation.getReviewBundle(id, { userId, role });
  }

  @Patch('listings/:id')
  @Roles('admin', 'editor', 'manager')
  @ApiOperation({ summary: 'Действие модерации (approve/reject/...)' })
  action(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerationActionDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.moderation.applyAction(id, dto, { userId, role });
  }
}
