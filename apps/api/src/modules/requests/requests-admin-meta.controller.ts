import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { RequestsService } from './requests.service';

/**
 * Static admin/request routes — separate controller so :id never shadows workload/assignees.
 */
@ApiTags('Admin / Requests')
@ApiBearerAuth()
@Controller('admin/requests')
@Roles('admin', 'editor', 'manager')
export class RequestsAdminMetaController {
  constructor(private readonly service: RequestsService) {}

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
