import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../auth/decorators';
import { FeedImportService } from './feed-import.service';
import { FeedRecoveryService } from './feed-recovery.service';

@ApiTags('Admin / Feed Import')
@ApiBearerAuth()
@Controller('admin/feed-import')
export class FeedImportController {
  constructor(
    private readonly service: FeedImportService,
    private readonly recovery: FeedRecoveryService,
  ) {}

  @Post('trigger')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger feed import manually' })
  @ApiQuery({ name: 'region', required: false, example: 'msk | all' })
  trigger(
    @CurrentUser('sub') userId: string,
    @Query('region') region?: string,
  ) {
    const regionCode = String(region || 'msk').trim().toLowerCase();
    if (regionCode === 'all') {
      return this.service.triggerImportForEnabledRegions(userId);
    }
    return this.service.triggerImport(regionCode, userId);
  }

  @Get('progress')
  @Roles('editor')
  @ApiOperation({ summary: 'Get current import progress' })
  getProgress() {
    return this.service.getProgress() || { step: 'idle', percent: 0 };
  }

  @Get('sources')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'List configured regional feed sources and required files' })
  listSources() {
    return this.service.listFeedSources();
  }

  @Post('trigger-selected')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger feed import for selected regions' })
  triggerSelected(
    @CurrentUser('sub') userId: string,
    @Body('regions') regions: string[] = [],
  ) {
    return this.service.triggerImportForRegions(regions, userId);
  }

  @Post('stop')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Stop all pending/running feed imports' })
  stopAll() {
    return this.service.stopActiveImports('Stopped manually from admin');
  }

  @Get('integrity')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Forensic feed vs DB integrity report with integrity score',
  })
  @ApiQuery({ name: 'region', required: false, example: 'msk' })
  @ApiQuery({
    name: 'include_apartments',
    required: false,
    description: 'Fetch full apartments.json to count (heavy)',
  })
  integrity(
    @Query('region') region?: string,
    @Query('include_apartments') includeApartments?: string,
  ) {
    return this.service.getFeedIntegrityReport(
      String(region || 'msk').toLowerCase(),
      includeApartments === '1' || includeApartments === 'true',
    );
  }

  @Get('health')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Feed import health summary (DB + queue, no heavy feed fetch)' })
  health() {
    return this.service.getHealthSummary();
  }

  @Get('diagnostics')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Отчёт: фид TrendAgent (about, blocks.json) vs БД и счётчик витрины',
  })
  @ApiQuery({ name: 'region', required: false, example: 'msk' })
  diagnostics(@Query('region') region?: string) {
    return this.service.feedVsDbDiagnostics(String(region || 'msk').toLowerCase());
  }

  @Get('probe')
  @Roles('admin', 'editor')
  @ApiOperation({
    summary: 'Быстрая проверка доступности фида по региону (about.json + обязательные файлы)',
  })
  @ApiQuery({ name: 'region', required: false, example: 'msk' })
  probe(@Query('region') region?: string) {
    return this.service.probeRegionFeed(String(region || 'msk').toLowerCase());
  }

  @Get('history')
  @Roles('editor')
  @ApiOperation({ summary: 'Get import history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'per_page', required: false })
  getHistory(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    return this.service.getHistory(undefined, page ? +page : 1, perPage ? +perPage : 20);
  }

  @Post('history/:id/stop')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Stop an import batch' })
  stopBatch(@Param('id', ParseIntPipe) id: number) {
    return this.service.stopBatch(id, 'Stopped manually from admin');
  }

  @Delete('history/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an import batch from history' })
  deleteBatch(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteBatch(id);
  }

  @Post('refresh-cache')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Refresh materialized cache for catalog/search' })
  refreshCache() {
    return this.service.refreshCatalogSearchCache();
  }

  @Get('recovery/data-quality')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Public catalog data quality audit after recovery' })
  @ApiQuery({ name: 'region', required: false })
  dataQuality(@Query('region') region?: string) {
    return this.recovery.getPublicDataQualityAudit(String(region || 'msk').toLowerCase());
  }

  @Get('recovery/audit')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Production state audit — status/visibility breakdown, top SOLD blocks' })
  @ApiQuery({ name: 'region', required: false })
  recoveryAudit(@Query('region') region?: string) {
    return this.recovery.getProductionStateAudit(String(region || 'msk').toLowerCase());
  }

  @Get('recovery/sold-plan')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Dry-run plan: false SOLD vs legitimate SOLD against live feed' })
  @ApiQuery({ name: 'region', required: false })
  soldRecoveryPlan(@Query('region') region?: string) {
    return this.recovery.planSoldRecovery(String(region || 'msk').toLowerCase());
  }

  @Post('recovery/sold-restore')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore false SOLD listings present in current feed snapshot' })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'dry_run', required: false, description: '1 = preview only' })
  soldRecoveryRestore(
    @Query('region') region?: string,
    @Query('dry_run') dryRun?: string,
  ) {
    const code = String(region || 'msk').toLowerCase();
    const preview = dryRun === '1' || dryRun === 'true';
    return preview
      ? this.recovery.planSoldRecovery(code)
      : this.recovery.executeSoldRecovery(code, false);
  }

  @Get('recovery/incident')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Incident status: degraded imports, SOLD spike, recovery recommendation' })
  @ApiQuery({ name: 'region', required: false })
  incidentStatus(@Query('region') region?: string) {
    return this.recovery.getIncidentStatus(String(region || 'msk').toLowerCase());
  }

  @Get('snapshots')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Import snapshot trend — feed counts and integrity over time' })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'limit', required: false })
  snapshotTrend(
    @Query('region') region?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recovery.getSnapshotTrend(
      String(region || 'msk').toLowerCase(),
      limit ? Math.min(52, Math.max(1, +limit)) : 12,
    );
  }
}
