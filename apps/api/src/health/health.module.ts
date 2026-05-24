import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PlatformStabilityModule } from '../modules/platform-stability/platform-stability.module';

@Module({
  imports: [PlatformStabilityModule],
  controllers: [HealthController],
})
export class HealthModule {}
