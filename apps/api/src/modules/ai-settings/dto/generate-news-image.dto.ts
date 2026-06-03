import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class GenerateNewsImageDto {
  @ApiPropertyOptional({ description: 'Заголовок новости' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ description: 'Текст / описание новости (HTML допустим)' })
  @IsOptional()
  @IsString()
  @MaxLength(12_000)
  body?: string;

  @ApiPropertyOptional({ description: 'Папка медиатеки (по умолчанию «Загрузки»)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  folderId?: number;
}
