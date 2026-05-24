import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { SystemDiagnosticsGovernanceService } from './system-diagnostics-governance.service';
import { AdminRouteContractService } from './admin-route-contract.service';

@ApiTags('Admin / System')
@ApiBearerAuth()
@Controller('admin/system')
@Roles('admin', 'editor')
export class SystemDiagnosticsController {
  constructor(
    private readonly diagnostics: SystemDiagnosticsGovernanceService,
    private readonly routeContract: AdminRouteContractService,
  ) {}

  @Get('route-contract')
  @ApiOperation({ summary: 'Admin API route contract manifest (Iter 82)' })
  getRouteContract() {
    return this.routeContract.getContract();
  }

  @Get('diagnostics')
  @ApiOperation({ summary: 'Read-only operational diagnostics (Iter 58+61)' })
  getDiagnostics() {
    return this.diagnostics.getDiagnostics();
  }

  @Get('platform')
  @ApiOperation({ summary: 'Schema/migration compatibility snapshot (Iter 61)' })
  async getPlatform() {
    return this.diagnostics.refreshPlatform();
  }
}
