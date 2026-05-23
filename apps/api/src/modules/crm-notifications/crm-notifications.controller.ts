import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { CrmNotificationsService } from './crm-notifications.service';
import { CrmReminderService } from './crm-reminder.service';

@ApiTags('Admin / CRM Notifications')
@ApiBearerAuth()
@Controller('admin/crm-notifications')
@Roles('admin', 'editor', 'manager')
export class CrmNotificationsController {
  constructor(
    private readonly notifications: CrmNotificationsService,
    private readonly reminders: CrmReminderService,
  ) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.notifications.getUnreadCount(userId).then((count) => ({ count }));
  }

  @Get()
  @ApiOperation({ summary: 'List CRM notifications for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  @ApiQuery({ name: 'unread_only', required: false })
  list(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
    @Query('unread_only') unreadOnly?: string,
  ) {
    return this.notifications.listForRecipient(
      userId,
      page,
      perPage,
      unreadOnly === '1' || unreadOnly === 'true',
    );
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications read' })
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Post('dev/sla-scan')
  @Roles('admin')
  @ApiOperation({ summary: 'DEV/admin: run SLA attention scan (no external send)' })
  devSlaScan() {
    return this.reminders.runSlaAttentionScan();
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification read' })
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: string) {
    return this.notifications.markRead(id, userId);
  }
}
