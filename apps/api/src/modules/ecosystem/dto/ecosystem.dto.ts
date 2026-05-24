import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ECOSYSTEM_THEME_KEYS, PUBLIC_PROFILE_STATUSES } from '@lg/shared';

export class UpsertAgencyProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  regionIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  socialLinks?: Record<string, string>;
}

export class UpsertAgentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  specializations?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  regionIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyProfileId?: string;
}

export class AdminProfileStatusDto {
  @ApiProperty({ enum: PUBLIC_PROFILE_STATUSES })
  @IsIn(PUBLIC_PROFILE_STATUSES)
  status!: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moderationNote?: string;
}

export class AdminBrandingModerationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerUrl?: string | null;

  @ApiPropertyOptional({ enum: ECOSYSTEM_THEME_KEYS })
  @IsOptional()
  @IsIn(ECOSYSTEM_THEME_KEYS)
  themeKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moderationNote?: string;
}

export class QueryEcosystemListingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  per_page?: number;
}
