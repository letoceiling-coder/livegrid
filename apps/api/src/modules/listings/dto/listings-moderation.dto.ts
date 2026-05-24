import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class QueryModerationQueueDto {
  @ApiPropertyOptional({
    enum: ['REVIEW', 'REJECTED', 'PENDING_REVISION', 'RECENTLY_APPROVED'],
  })
  @IsOptional()
  @IsIn(['REVIEW', 'REJECTED', 'PENDING_REVISION', 'RECENTLY_APPROVED'])
  tab?: 'REVIEW' | 'REJECTED' | 'PENDING_REVISION' | 'RECENTLY_APPROVED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  owner_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  stale_only?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;
}

export class ModerationActionDto {
  @ApiPropertyOptional({
    enum: ['approve', 'reject', 'request_changes', 'archive', 'restore'],
  })
  @IsIn(['approve', 'reject', 'request_changes', 'archive', 'restore'])
  action!: 'approve' | 'reject' | 'request_changes' | 'archive' | 'restore';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ description: 'Optimistic concurrency version' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}
