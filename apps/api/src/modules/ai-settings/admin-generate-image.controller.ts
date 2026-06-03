import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/decorators';
import { AiImageService } from './ai-image.service';
import { GenerateNewsImageDto } from './dto/generate-news-image.dto';

@ApiTags('Admin / AI')
@ApiBearerAuth()
@Controller('admin')
export class AdminGenerateImageController {
  constructor(private readonly images: AiImageService) {}

  @Post('generate-image')
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Сгенерировать обложку новости (DALL-E 3) и сохранить в медиатеку' })
  generateNewsCover(@Body() dto: GenerateNewsImageDto, @CurrentUser('sub') userId: string) {
    return this.images.generateNewsCover({
      title: dto.title,
      body: dto.body,
      folderId: dto.folderId,
      userId,
    });
  }
}
