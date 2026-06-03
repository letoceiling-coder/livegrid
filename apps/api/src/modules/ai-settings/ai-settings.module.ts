import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminGenerateImageController } from './admin-generate-image.controller';
import { AiImageService } from './ai-image.service';
import { AiSettingsAdminController } from './ai-settings.controller';
import { AiSettingsService } from './ai-settings.service';
import { AiRewriteService } from './ai-rewrite.service';
import { SecretCryptoService } from '../../common/crypto/secret-crypto.service';

@Module({
  imports: [MediaModule],
  controllers: [AiSettingsAdminController, AdminGenerateImageController],
  providers: [AiSettingsService, AiRewriteService, AiImageService, SecretCryptoService],
  exports: [AiSettingsService, AiRewriteService, AiImageService, SecretCryptoService],
})
export class AiSettingsModule {}
