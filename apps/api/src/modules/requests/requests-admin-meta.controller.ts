import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../auth/decorators';
import { RequestsService } from './requests.service';
import { ResponseVelocityService } from './response-velocity.service';

/**
 * Static admin/request routes — separate controller so :id never shadows workload/assignees.
 */
@ApiTags('Admin / Requests')
@ApiBearerAuth()
@Controller('admin/requests')
@Roles('admin', 'editor', 'manager')
export class RequestsAdminMetaController {
  constructor(
    private readonly service: RequestsService,
    private readonly velocity: ResponseVelocityService,
  ) {}

  @Get('responsiveness-metrics')
  @ApiOperation({ summary: 'Lead velocity and response-time diagnostics' })
  responsivenessMetrics() {
    return this.velocity.getResponsivenessMetrics();
  }

  @Get('workload')
  @ApiOperation({ summary: 'Admin: manager workload + SLA counts' })
  getWorkload() {
    return this.service.getWorkload();
  }

  @Get('assignees')
  @ApiOperation({ summary: 'Admin: list assignees for requests (manager/agent/editor)' })
  listAssignees() {
    return this.service.listAssignees();
  }
}
