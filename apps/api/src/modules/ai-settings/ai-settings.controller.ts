import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiProviderKind } from '@prisma/client';
import { Roles } from '../../auth/decorators';
import { AiSettingsService } from './ai-settings.service';

@ApiTags('Admin / AI Settings')
@Controller('admin/settings/ai')
export class AiSettingsAdminController {
  constructor(private readonly service: AiSettingsService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: AI provider settings (keys masked)' })
  getSettings() {
    return this.service.getAdminSettings();
  }

  @Put('active-provider')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: set active AI provider for news rewrite' })
  setActive(@Body() body: { provider: AiProviderKind | null }) {
    return this.service.setActiveProvider(body.provider ?? null);
  }

  @Put(':provider')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: update AI provider settings' })
  updateProvider(
    @Param('provider') provider: AiProviderKind,
    @Body()
    body: {
      isEnabled?: boolean;
      apiKey?: string | null;
      defaultModel?: string | null;
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
      retryCount?: number;
      systemPrompt?: string;
    },
  ) {
    return this.service.updateProvider(provider, body);
  }

  @Post(':provider/test')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: test AI provider connection' })
  testConnection(@Param('provider') provider: AiProviderKind) {
    return this.service.testConnection(provider);
  }
}
