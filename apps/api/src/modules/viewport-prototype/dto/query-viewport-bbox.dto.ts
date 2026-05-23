import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/** Bbox corners shared by viewport prototype endpoints */
export class QueryViewportBboxDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  sw_lat!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  sw_lng!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  ne_lat!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  ne_lng!: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(22)
  zoom?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiProperty({
    required: false,
    description: 'Keyset cursor — block slug or listing id from prior response meta.cursor',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
