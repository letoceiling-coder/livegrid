import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListingLifecycleDto {
  @ApiProperty({ enum: ['publish', 'hide', 'archive', 'draft', 'republish'] })
  @IsIn(['publish', 'hide', 'archive', 'draft', 'republish'])
  action!: 'publish' | 'hide' | 'archive' | 'draft' | 'republish';
}

export class AssignListingOwnerDto {
  @ApiProperty({ description: 'Agent/manager user UUID' })
  @IsUUID()
  ownerUserId!: string;
}

export class TransferListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}
