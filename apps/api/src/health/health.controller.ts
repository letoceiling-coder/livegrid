import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators';
import { PlatformStabilityService } from '../modules/platform-stability/platform-stability.service';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platform: PlatformStabilityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const dbOk = await this.prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    const platform = this.platform.getSnapshot();
    const schemaOk = platform.ok;

    const status = dbOk && schemaOk ? 'ok' : dbOk ? 'degraded' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'up' : 'down',
        schema: schemaOk ? 'compatible' : 'drift',
      },
      ...(platform.bootWarningsRu.length
        ? {
            warnings: platform.bootWarnings,
            warningsRu: platform.bootWarningsRu,
            pendingMigrations: platform.pendingMigrations,
          }
        : {}),
    };
  }
}
