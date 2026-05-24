import { Module } from '@nestjs/common';
import { PlatformStabilityService } from './platform-stability.service';

@Module({
  providers: [PlatformStabilityService],
  exports: [PlatformStabilityService],
})
export class PlatformStabilityModule {}
