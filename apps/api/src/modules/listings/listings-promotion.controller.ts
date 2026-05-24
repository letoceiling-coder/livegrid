import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import {
  AgentPromotionRequestDto,
  AssignPromotionDto,
  BulkExpirePromotionsDto,
  QueryPromotionsDto,
} from './dto/listings-promotion.dto';
import { ListingsPromotionService } from './listings-promotion.service';

@ApiTags('Admin / Listing Promotions')
@ApiBearerAuth()
@Controller('admin/listings/promotions')
export class ListingsPromotionAdminController {
  constructor(private readonly promotions: ListingsPromotionService) {}

  @Get('stats')
  @Roles('manager')
  @ApiOperation({ summary: 'Promotion metrics (DEV/debug)' })
  stats() {
    return this.promotions.getStats();
  }

  @Get()
  @Roles('manager')
  @ApiOperation({ summary: 'Active promotions queue' })
  list(@Query() query: QueryPromotionsDto) {
    return this.promotions.listPromotions(query);
  }

  @Patch(':listingId')
  @Roles('manager')
  @ApiOperation({ summary: 'Assign VIP / Boost / Premium' })
  assign(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() dto: AssignPromotionDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.promotions.assignPromotion(listingId, dto, { userId, role });
  }

  @Delete(':listingId')
  @Roles('manager')
  @ApiOperation({ summary: 'Remove promotion' })
  remove(
    @Param('listingId', ParseIntPipe) listingId: number,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.promotions.removePromotion(listingId, { userId, role });
  }

  @Post('expire')
  @Roles('manager')
  @ApiOperation({ summary: 'Bulk expire stale promotions' })
  bulkExpire(@Body() dto: BulkExpirePromotionsDto) {
    return this.promotions.bulkExpire(dto.limit ?? 500);
  }
}

@ApiTags('Account / Promotions')
@ApiBearerAuth()
@Controller('account/listings')
export class ListingsPromotionAgentController {
  constructor(private readonly promotions: ListingsPromotionService) {}

  @Post(':listingId/promotion/request')
  @Roles('agent')
  @ApiOperation({ summary: 'Request promotion (no payment — ops workflow)' })
  request(
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() dto: AgentPromotionRequestDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.promotions.agentRequestPromotion(listingId, dto, { userId, role });
  }
}
