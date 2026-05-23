import { Controller, Get, Param, Query, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { GeoPresetsService } from './geo-presets.service';
import { GeoShadowLineageService } from './geo-shadow-lineage.service';
import { GeoMaterializationDryRunService } from './geo-materialization-dry-run.service';
import { GeoMaterializationJobService } from './geo-materialization-job.service';

function shadowObservabilityEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(
    private readonly presets: GeoPresetsService,
    private readonly shadowLineage: GeoShadowLineageService,
    private readonly dryRunService: GeoMaterializationDryRunService,
    private readonly materializationJob: GeoMaterializationJobService,
  ) {}

  @Public()
  @Get('presets/:key')
  @ApiOperation({ summary: 'GeoJSON полигона по ключу (карта / каталог)' })
  preset(@Param('key') key: string) {
    return this.presets.getPolygonForPreset(key);
  }

  /** DEV-only read-only shadow lineage metrics (Iter 20) — no writes */
  @Public()
  @Get('_shadow/lineage-stats')
  @ApiOperation({ summary: 'DEV: shadow geo resolver metrics (read-only)' })
  async shadowLineageStats() {
    if (!shadowObservabilityEnabled()) {
      throw new ServiceUnavailableException('Shadow geo observability disabled in production');
    }
    const metrics = await this.shadowLineage.collectShadowMetrics(1);
    return { shadow: true, readOnly: true, regionId: 1, metrics };
  }

  /** DEV-only full materialization dry-run (Iter 21) — zero writes */
  @Public()
  @Get('_shadow/materialization-dry-run')
  @ApiOperation({ summary: 'DEV: simulate geo normalization (read-only dry-run)' })
  async materializationDryRun() {
    if (!shadowObservabilityEnabled()) {
      throw new ServiceUnavailableException('Shadow geo dry-run disabled in production');
    }
    return this.dryRunService.runDryRun({ regionId: 1 });
  }

  /** DEV-only staging materialization job (Iter 23) */
  @Public()
  @Get('_shadow/materialization/run')
  @ApiOperation({ summary: 'DEV: run staging geo materialization (inherit scope)' })
  async runMaterialization(
    @Query('dryRun') dryRun?: string,
    @Query('regionId') regionId?: string,
    @Query('maxBatches') maxBatches?: string,
  ) {
    if (!shadowObservabilityEnabled()) {
      throw new ServiceUnavailableException('Staging materialization disabled in production');
    }
    return this.materializationJob.runJob({
      regionId: regionId != null ? Number(regionId) : 1,
      dryRun: dryRun === '1' || dryRun === 'true',
      maxBatches: maxBatches != null ? Number(maxBatches) : undefined,
    });
  }

  @Public()
  @Get('_shadow/materialization/observability')
  @ApiOperation({ summary: 'DEV: post-materialization observability metrics' })
  async materializationObservability(@Query('regionId') regionId?: string) {
    if (!shadowObservabilityEnabled()) {
      throw new ServiceUnavailableException('Staging observability disabled in production');
    }
    const metrics = await this.materializationJob.collectObservability(
      regionId != null ? Number(regionId) : 1,
    );
    const parity = await this.materializationJob.validateResolverParity(
      regionId != null ? Number(regionId) : 1,
    );
    return { staging: true, metrics, parity };
  }

  @Public()
  @Get('_shadow/materialization/rollback/:runId')
  @ApiOperation({ summary: 'DEV: rollback a materialization run by runId' })
  async rollbackMaterialization(@Param('runId') runId: string) {
    if (!shadowObservabilityEnabled()) {
      throw new ServiceUnavailableException('Staging rollback disabled in production');
    }
    return this.materializationJob.rollbackRun(runId);
  }
}
