import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { WizardServerPayload } from '@lg/shared';

export class WizardSellerPayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class WizardPayloadDto implements WizardServerPayload {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kind!: WizardServerPayload['kind'];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  regionId!: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blockId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lat!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lng!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  price!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerUserId!: string | null;

  @ApiPropertyOptional({ enum: ['self', 'agent', 'agency'] })
  @IsOptional()
  @IsIn(['self', 'agent', 'agency'])
  ownerMode!: WizardServerPayload['ownerMode'];

  @ApiPropertyOptional({ enum: ['draft', 'publish', 'archive', 'submit_review'] })
  @IsOptional()
  @IsIn(['draft', 'publish', 'archive', 'submit_review'])
  publishAction!: WizardServerPayload['publishAction'];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  apartment!: Record<string, string | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  house!: Record<string, string | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  land!: Record<string, string | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  commercial!: Record<string, string | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parking!: Record<string, string | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mainPhotoUrl!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  extraPhotoUrls!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planUrl!: string;

  @ApiPropertyOptional({ type: WizardSellerPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WizardSellerPayloadDto)
  seller!: WizardServerPayload['seller'];
}

export class CreateWizardDraftDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  regionId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kind?: string;
}

export class SaveWizardDraftDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => WizardPayloadDto)
  payload!: WizardPayloadDto;

  @ApiProperty()
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  wizardStep?: number;
}

export class SubmitWizardDraftDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => WizardPayloadDto)
  payload!: WizardPayloadDto;

  @ApiProperty()
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ enum: ['draft', 'publish', 'archive', 'submit_review'] })
  @IsIn(['draft', 'publish', 'archive', 'submit_review'])
  publishAction!: 'draft' | 'publish' | 'archive' | 'submit_review';
}

export class ListingModerationDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
