import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { LegacyGeoReviewService } from './legacy-geo-review.service';
import { LegacyGeoReviewDecisionDto } from './dto/legacy-geo-review.dto';
import { LegacyGeoReviewValidationError } from './legacy-geo-review.types';

function shadowReviewEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function guardShadowReview(): void {
  if (!shadowReviewEnabled()) {
    throw new ServiceUnavailableException('Legacy geo review disabled in production');
  }
}

function mapReviewError(err: unknown): never {
  if (err instanceof LegacyGeoReviewValidationError) {
    throw new BadRequestException({ code: err.code, message: err.message });
  }
  throw err;
}

@ApiTags('Geo')
@Controller('geo/_shadow/legacy-review')
export class LegacyGeoReviewController {
  constructor(private readonly review: LegacyGeoReviewService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'DEV: list SHADOW_UNCLASSIFIED listings for human review' })
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('regionId') regionId?: string,
  ) {
    guardShadowReview();
    return this.review.listShadowUnclassified({
      cursor: cursor != null ? Number(cursor) : undefined,
      limit: limit != null ? Number(limit) : undefined,
      regionId: regionId != null ? Number(regionId) : undefined,
    });
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'DEV: legacy geo review metrics' })
  async stats() {
    guardShadowReview();
    const metrics = await this.review.collectStats();
    return { shadow: true, readOnly: false, metrics };
  }

  @Public()
  @Get('export')
  @ApiOperation({ summary: 'DEV: CSV export of legacy geo review rows' })
  async exportCsv() {
    guardShadowReview();
    const csv = await this.review.exportReviewCsv();
    return { shadow: true, csv, rowCount: csv.split('\n').length - 1 };
  }

  @Public()
  @Post('session/belgorod-complete')
  @ApiOperation({ summary: 'DEV: complete Belgorod review session (APPROVED_AS_EXACT)' })
  async completeBelgorod(@Body() body: { reviewer: string }) {
    guardShadowReview();
    if (!body.reviewer?.trim()) {
      throw new BadRequestException('reviewer required');
    }
    return this.review.completeBelgorodReviewSession(body.reviewer.trim());
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'DEV: single legacy geo review row + decision history' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    guardShadowReview();
    try {
      return await this.review.getByListingId(id);
    } catch (err) {
      if (err instanceof LegacyGeoReviewValidationError && err.code === 'NOT_SHADOW_UNCLASSIFIED') {
        throw new NotFoundException(err.message);
      }
      mapReviewError(err);
    }
  }

  @Public()
  @Post('decision')
  @ApiOperation({ summary: 'DEV: record human review decision (no listing geo writes)' })
  async recordDecision(@Body() dto: LegacyGeoReviewDecisionDto) {
    guardShadowReview();
    try {
      return await this.review.recordDecision(dto);
    } catch (err) {
      mapReviewError(err);
    }
  }
}
