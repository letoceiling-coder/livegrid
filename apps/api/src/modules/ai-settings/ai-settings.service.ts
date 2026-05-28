import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiProviderKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SecretCryptoService } from '../../common/crypto/secret-crypto.service';
import { AiRewriteService } from './ai-rewrite.service';
import {
  AI_PROVIDER_MODELS,
  DEFAULT_NEWS_SYSTEM_PROMPT,
} from './ai-settings.constants';

export type AiProviderAdminDto = {
  provider: AiProviderKind;
  isEnabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  defaultModel: string | null;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retryCount: number;
  systemPrompt: string;
  totalCostUsd: string;
  totalTokens: number;
  availableModels: string[];
};

@Injectable()
export class AiSettingsService implements OnModuleInit {
  private readonly log = new Logger(AiSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretCryptoService,
    private readonly rewrite: AiRewriteService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async ensureDefaults() {
    const providers: AiProviderKind[] = ['OPENAI', 'OPENROUTER', 'GEMINI', 'CLAUDE'];
    for (const provider of providers) {
      await this.prisma.aiProviderSetting.upsert({
        where: { provider },
        create: {
          provider,
          systemPrompt: DEFAULT_NEWS_SYSTEM_PROMPT,
          defaultModel: AI_PROVIDER_MODELS[provider]?.[0] ?? null,
        },
        update: {},
      });
    }
    await this.prisma.newsAiGlobalSetting.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  async getAdminSettings(): Promise<{
    activeProvider: AiProviderKind | null;
    providers: AiProviderAdminDto[];
  }> {
    await this.ensureDefaults();
    const [global, rows] = await Promise.all([
      this.prisma.newsAiGlobalSetting.findUnique({ where: { id: 1 } }),
      this.prisma.aiProviderSetting.findMany({ orderBy: { provider: 'asc' } }),
    ]);
    return {
      activeProvider: global?.activeProvider ?? null,
      providers: rows.map((r) => this.toAdminDto(r)),
    };
  }

  async updateProvider(
    provider: AiProviderKind,
    dto: {
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
    await this.ensureDefaults();
    const existing = await this.prisma.aiProviderSetting.findUnique({ where: { provider } });
    if (!existing) throw new NotFoundException(`Provider ${provider} not found`);

    const data: Prisma.AiProviderSettingUpdateInput = {};
    if (dto.isEnabled != null) data.isEnabled = dto.isEnabled;
    if (dto.defaultModel !== undefined) data.defaultModel = dto.defaultModel;
    if (dto.temperature != null) data.temperature = dto.temperature;
    if (dto.maxTokens != null) data.maxTokens = dto.maxTokens;
    if (dto.timeoutMs != null) data.timeoutMs = dto.timeoutMs;
    if (dto.retryCount != null) data.retryCount = dto.retryCount;
    if (dto.systemPrompt != null) data.systemPrompt = dto.systemPrompt;

    if (dto.apiKey !== undefined) {
      const trimmed = (dto.apiKey ?? '').trim();
      if (trimmed === '') {
        data.apiKeyEnc = null;
      } else if (trimmed === '__UNCHANGED__') {
        // sentinel from frontend when key not edited
      } else {
        if (!this.crypto.isConfigured()) {
          throw new BadRequestException(
            'AI_SETTINGS_ENCRYPTION_KEY не настроен на сервере. Невозможно сохранить API-ключ.',
          );
        }
        data.apiKeyEnc = this.crypto.encrypt(trimmed);
      }
    }

    const updated = await this.prisma.aiProviderSetting.update({
      where: { provider },
      data,
    });
    return this.toAdminDto(updated);
  }

  async setActiveProvider(provider: AiProviderKind | null) {
    await this.ensureDefaults();
    if (provider) {
      const row = await this.prisma.aiProviderSetting.findUnique({ where: { provider } });
      if (!row?.isEnabled) {
        throw new BadRequestException('Выберите включённого провайдера');
      }
    }
    await this.prisma.newsAiGlobalSetting.upsert({
      where: { id: 1 },
      create: { id: 1, activeProvider: provider },
      update: { activeProvider: provider },
    });
    return { activeProvider: provider };
  }

  async testConnection(provider: AiProviderKind) {
    const settings = await this.getProviderRuntime(provider);
    return this.rewrite.testProvider(settings);
  }

  async getActiveProviderRuntime() {
    const global = await this.prisma.newsAiGlobalSetting.findUnique({ where: { id: 1 } });
    const provider = global?.activeProvider;
    if (!provider) {
      throw new BadRequestException('AI-провайдер не выбран. Настройте в /admin/settings/ai');
    }
    return this.getProviderRuntime(provider);
  }

  async getProviderRuntime(provider: AiProviderKind) {
    const row = await this.prisma.aiProviderSetting.findUnique({ where: { provider } });
    if (!row?.isEnabled) {
      throw new BadRequestException(`Провайдер ${provider} отключён`);
    }
    if (!row.apiKeyEnc) {
      throw new BadRequestException(`API-ключ для ${provider} не задан`);
    }
    if (!this.crypto.isConfigured()) {
      throw new ServiceUnavailableException('Шифрование не настроено на сервере');
    }
    let apiKey: string;
    try {
      apiKey = this.crypto.decrypt(row.apiKeyEnc);
    } catch (e) {
      this.log.error(`Failed to decrypt API key for ${provider}`);
      throw new ServiceUnavailableException('Не удалось расшифровать API-ключ');
    }
    return {
      provider,
      apiKey,
      model: row.defaultModel ?? AI_PROVIDER_MODELS[provider]?.[0] ?? '',
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      timeoutMs: row.timeoutMs,
      retryCount: row.retryCount,
      systemPrompt: row.systemPrompt || DEFAULT_NEWS_SYSTEM_PROMPT,
    };
  }

  async recordUsage(
    provider: AiProviderKind,
    tokens: number,
    costUsd: number,
  ) {
    await this.prisma.aiProviderSetting.update({
      where: { provider },
      data: {
        totalTokens: { increment: tokens },
        totalCostUsd: { increment: costUsd },
      },
    });
  }

  private toAdminDto(row: {
    provider: AiProviderKind;
    isEnabled: boolean;
    apiKeyEnc: string | null;
    defaultModel: string | null;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    retryCount: number;
    systemPrompt: string;
    totalCostUsd: Prisma.Decimal;
    totalTokens: number;
  }): AiProviderAdminDto {
    let masked: string | null = null;
    if (row.apiKeyEnc) {
      try {
        const plain = this.crypto.isConfigured() ? this.crypto.decrypt(row.apiKeyEnc) : null;
        masked = this.crypto.maskKey(plain);
      } catch {
        masked = '••••••••';
      }
    }
    return {
      provider: row.provider,
      isEnabled: row.isEnabled,
      hasApiKey: Boolean(row.apiKeyEnc),
      apiKeyMasked: masked,
      defaultModel: row.defaultModel,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      timeoutMs: row.timeoutMs,
      retryCount: row.retryCount,
      systemPrompt: row.systemPrompt,
      totalCostUsd: row.totalCostUsd.toString(),
      totalTokens: row.totalTokens,
      availableModels: AI_PROVIDER_MODELS[row.provider] ?? [],
    };
  }
}
