import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ListingGeoReviewStatus } from '../legacy-geo-review.types';

export class LegacyGeoReviewDecisionDto {
  @ApiProperty()
  @IsInt()
  listingId!: number;

  @ApiProperty({ enum: ListingGeoReviewStatus })
  @IsEnum(ListingGeoReviewStatus)
  reviewStatus!: ListingGeoReviewStatus;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  reviewer!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionReason?: string;
}

export class LegacyGeoReviewListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cursor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  regionId?: number;
}
