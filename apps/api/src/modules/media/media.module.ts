import { Module } from '@nestjs/common';
import { MediaAdminController } from './media-admin.controller';
import { MediaReconcileService } from './media-reconcile.service';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaAdminController],
  providers: [MediaService, MediaReconcileService],
  exports: [MediaService, MediaReconcileService],
})
export class MediaModule {}
