import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListingLifecycleDto {
  @ApiProperty({
    enum: ['publish', 'hide', 'archive', 'draft', 'republish', 'submit_review', 'approve', 'reject'],
  })
  @IsIn(['publish', 'hide', 'archive', 'draft', 'republish', 'submit_review', 'approve', 'reject'])
  action!:
    | 'publish'
    | 'hide'
    | 'archive'
    | 'draft'
    | 'republish'
    | 'submit_review'
    | 'approve'
    | 'reject';
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
