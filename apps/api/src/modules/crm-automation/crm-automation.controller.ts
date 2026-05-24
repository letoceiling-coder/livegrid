import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { CrmAutomationEngineService } from './crm-automation-engine.service';
import { CrmAutomationTasksService, type TaskFilter } from './crm-automation-tasks.service';

@ApiTags('Admin / CRM Automation')
@ApiBearerAuth()
@Controller('admin')
@Roles('admin', 'editor', 'manager')
export class CrmAutomationTasksController {
  constructor(
    private readonly tasks: CrmAutomationTasksService,
    private readonly engine: CrmAutomationEngineService,
  ) {}

  @Get('tasks/summary')
  @ApiOperation({ summary: 'Task center counts for current manager' })
  getSummary(@CurrentUser('sub') userId: string) {
    return this.tasks.getSummary(userId);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Manager task queue' })
  @ApiQuery({ name: 'filter', required: false, enum: ['today', 'overdue', 'followup', 'callbacks', 'escalations', 'completed'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  listTasks(
    @CurrentUser('sub') userId: string,
    @Query('filter') filter?: TaskFilter,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.tasks.listForAssignee(userId, filter ?? 'today', page ?? 1, perPage ?? 50);
  }

  @Post('tasks/:id/complete')
  @ApiOperation({ summary: 'Complete a follow-up task' })
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: string) {
    return this.tasks.completeTask(id, userId);
  }

  @Post('tasks/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a follow-up task' })
  dismiss(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') userId: string) {
    return this.tasks.dismissTask(id, userId);
  }

  @Get('requests/:id/automation')
  @ApiOperation({ summary: 'Automation context for request detail' })
  async getRequestAutomation(@Param('id', ParseIntPipe) id: number) {
    const [recommendations, context] = await Promise.all([
      this.engine.getRecommendationsForRequest(id),
      this.tasks.getRequestAutomationContext(id),
    ]);
    return { recommendations, ...context };
  }

  @Get('automation/metrics')
  @ApiOperation({ summary: 'Automation metrics for ops center' })
  getMetrics() {
    return this.engine.getMetrics();
  }

  @Post('automation/scan')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Trigger bounded automation scan (cron-safe)' })
  runScan() {
    return this.engine.runBoundedScan();
  }

  @Get('automation/debug')
  @ApiOperation({ summary: 'Last automation scan stats (DEV observability)' })
  getDebug() {
    return {
      lastScan: this.engine.getLastScanStats(),
    };
  }
}

@ApiTags('Admin / CRM Automation')
@ApiBearerAuth()
@Controller('admin/automation')
@Roles('admin', 'editor', 'manager')
export class CrmAutomationAdminController {
  constructor(private readonly engine: CrmAutomationEngineService) {}

  @Get('recommendations/:requestId')
  @ApiOperation({ summary: 'Rule-based workflow recommendations' })
  getRecommendations(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.engine.getRecommendationsForRequest(requestId);
  }
}
