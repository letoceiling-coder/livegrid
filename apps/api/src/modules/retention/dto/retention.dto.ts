import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import type { SavedSearchGeoContext, SavedSearchParamsJson } from '@lg/shared';

export class CreateSavedSearchDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsObject()
  paramsJson!: SavedSearchParamsJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  regionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geoContext?: SavedSearchGeoContext;

  @ApiPropertyOptional({ description: 'Overwrite existing search with same query hash' })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class UpdateSavedSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertNewMatches?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertPriceDrop?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  alertRestored?: boolean;
}

export class RecordBrowseHistoryDto {
  @ApiProperty({ enum: ['LISTING', 'BLOCK'] })
  @IsString()
  entityKind!: 'LISTING' | 'BLOCK';

  @ApiProperty()
  @IsInt()
  entityId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateFavoriteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectionId?: string | null;
}
