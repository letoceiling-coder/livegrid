import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BILLING_PLAN_IDS, PROMOTION_PRODUCT_LIST } from '@lg/shared';

const PRODUCT_IDS = PROMOTION_PRODUCT_LIST.map((p: { id: string }) => p.id);

export class ChangePlanDto {
  @ApiProperty({ enum: BILLING_PLAN_IDS })
  @IsIn(BILLING_PLAN_IDS)
  plan!: (typeof BILLING_PLAN_IDS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePromotionOrderDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  listingId!: number;

  @ApiProperty({ enum: PRODUCT_IDS })
  @IsIn(PRODUCT_IDS)
  productId!: string;
}

export class MarkInvoicePaidDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ManualAdjustmentDto {
  @ApiProperty()
  @IsInt()
  amountRub!: number;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryInvoicesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  per_page?: number;

  @ApiPropertyOptional({ enum: ['ISSUED', 'PAID', 'OVERDUE', 'VOID', 'DRAFT'] })
  @IsOptional()
  @IsIn(['ISSUED', 'PAID', 'OVERDUE', 'VOID', 'DRAFT'])
  status?: string;
}

export class QueryBillingAccountsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  per_page?: number;

  @ApiPropertyOptional({ enum: BILLING_PLAN_IDS })
  @IsOptional()
  @IsIn(BILLING_PLAN_IDS)
  plan?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CLOSED'])
  status?: string;
}
