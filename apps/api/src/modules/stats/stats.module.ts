import { Module, forwardRef } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { StatsAdminController, StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [forwardRef(() => RequestsModule)],
  controllers: [StatsController, StatsAdminController],
  providers: [StatsService],
})
export class StatsModule {}
