import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { ListingPromotionTier } from '@lg/shared';

export class AssignPromotionDto {
  @ApiProperty({ enum: ['VIP', 'BOOSTED', 'PREMIUM'] })
  @IsIn(['VIP', 'BOOSTED', 'PREMIUM'])
  tier!: ListingPromotionTier;

  @ApiProperty({ description: 'ISO datetime when promotion expires' })
  @IsDateString()
  promotedUntil!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkExpirePromotionsDto {
  @ApiPropertyOptional({ description: 'Max rows to expire in one call', default: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class QueryPromotionsDto {
  @ApiPropertyOptional({ enum: ['STANDARD', 'VIP', 'BOOSTED', 'PREMIUM'] })
  @IsOptional()
  @IsIn(['STANDARD', 'VIP', 'BOOSTED', 'PREMIUM'])
  tier?: ListingPromotionTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  region_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  per_page?: number;
}

export class AgentPromotionRequestDto {
  @ApiProperty({ enum: ['VIP', 'BOOSTED', 'PREMIUM'] })
  @IsIn(['VIP', 'BOOSTED', 'PREMIUM'])
  tier!: 'VIP' | 'BOOSTED' | 'PREMIUM';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
