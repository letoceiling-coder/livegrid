import { Module, forwardRef } from '@nestjs/common';
import { AiSettingsAdminController } from './ai-settings.controller';
import { AiSettingsService } from './ai-settings.service';
import { AiRewriteService } from './ai-rewrite.service';
import { SecretCryptoService } from '../../common/crypto/secret-crypto.service';

@Module({
  controllers: [AiSettingsAdminController],
  providers: [AiSettingsService, AiRewriteService, SecretCryptoService],
  exports: [AiSettingsService, AiRewriteService, SecretCryptoService],
})
export class AiSettingsModule {}
