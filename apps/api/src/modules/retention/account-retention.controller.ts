import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { BrowseHistoryService } from './browse-history.service';
import { CreateSavedSearchDto, RecordBrowseHistoryDto, UpdateSavedSearchDto } from './dto/retention.dto';
import { RetentionAlertsService } from './retention-alerts.service';
import { EngagementMetricsService } from './engagement-metrics.service';
import { SavedSearchesService } from './saved-searches.service';
import { UserNotificationsService } from './user-notifications.service';

@ApiTags('Account / Retention')
@ApiBearerAuth()
@Controller('account')
export class AccountRetentionController {
  constructor(
    private readonly savedSearches: SavedSearchesService,
    private readonly notifications: UserNotificationsService,
    private readonly history: BrowseHistoryService,
  ) {}

  @Get('saved-searches')
  @ApiOperation({ summary: 'List saved searches' })
  listSavedSearches(@CurrentUser('sub') userId: string) {
    return this.savedSearches.list(userId);
  }

  @Post('saved-searches')
  @ApiOperation({ summary: 'Create or overwrite saved search' })
  createSavedSearch(@CurrentUser('sub') userId: string, @Body() dto: CreateSavedSearchDto) {
    this.savedSearches.assertValidParams(dto.paramsJson);
    return this.savedSearches.create(userId, dto);
  }

  @Patch('saved-searches/:id')
  @ApiOperation({ summary: 'Update saved search' })
  updateSavedSearch(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.savedSearches.update(userId, id, dto);
  }

  @Delete('saved-searches/:id')
  @ApiOperation({ summary: 'Delete saved search' })
  deleteSavedSearch(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.savedSearches.remove(userId, id);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'User notifications' })
  listNotifications(
    @CurrentUser('sub') userId: string,
    @Query('unread_only') unreadOnly?: string,
  ) {
    return this.notifications.list(userId, { unreadOnly: unreadOnly === 'true' });
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification read' })
  markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications read' })
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Browse history' })
  listHistory(@CurrentUser('sub') userId: string) {
    return this.history.list(userId);
  }

  @Post('history')
  @ApiOperation({ summary: 'Record browse event' })
  recordHistory(@CurrentUser('sub') userId: string, @Body() dto: RecordBrowseHistoryDto) {
    return this.history.record(userId, dto);
  }

  @Delete('history/:id')
  @ApiOperation({ summary: 'Remove history item' })
  deleteHistory(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.history.remove(userId, id);
  }

  @Delete('history')
  @ApiOperation({ summary: 'Clear browse history' })
  clearHistory(@CurrentUser('sub') userId: string) {
    return this.history.clear(userId);
  }
}

@ApiTags('Admin / Retention')
@ApiBearerAuth()
@Controller('admin/retention')
export class RetentionAdminController {
  constructor(
    private readonly alerts: RetentionAlertsService,
    private readonly engagement: EngagementMetricsService,
  ) {}

  @Get('engagement-metrics')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Session depth and retention engagement metrics' })
  engagementMetrics() {
    return this.engagement.getEngagementMetrics();
  }

  @Post('scan')
  @Roles('editor')
  @ApiOperation({ summary: 'Run bounded retention alert scan' })
  scan() {
    return this.alerts.runBoundedScan();
  }
}
