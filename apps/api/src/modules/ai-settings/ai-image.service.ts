import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MediaService } from '../media/media.service';
import { AiSettingsService } from './ai-settings.service';
import { buildNewsCoverImagePrompt } from './news-image-prompt';

type OpenAiImageResponse = {
  data?: Array<{ url?: string; revised_prompt?: string }>;
  error?: { message?: string };
};

@Injectable()
export class AiImageService {
  private readonly log = new Logger(AiImageService.name);

  constructor(
    private readonly aiSettings: AiSettingsService,
    private readonly media: MediaService,
  ) {}

  async generateNewsCover(input: {
    title?: string;
    body?: string;
    folderId?: number;
    userId: string;
  }) {
    const { apiKey, model, size, timeoutMs } = await this.aiSettings.getImageGenerationRuntime();
    const prompt = buildNewsCoverImagePrompt({ title: input.title, body: input.body });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let imageUrl: string | undefined;
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size,
          ...(model === 'dall-e-3' ? { quality: 'standard' } : {}),
          response_format: 'url',
        }),
        signal: controller.signal,
      });
      const json = (await res.json()) as OpenAiImageResponse;
      if (!res.ok) {
        const msg = json.error?.message ?? res.statusText;
        this.log.warn(`OpenAI images error ${res.status}: ${msg}`);
        throw new BadRequestException(
          res.status === 429
            ? 'Лимит OpenAI. Повторите позже.'
            : `OpenAI: ${msg || 'ошибка генерации'}`,
        );
      }
      imageUrl = json.data?.[0]?.url;
      if (!imageUrl) throw new BadRequestException('OpenAI не вернул URL изображения');
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      if (e instanceof Error && e.name === 'AbortError') {
        throw new ServiceUnavailableException('Таймаут генерации изображения');
      }
      this.log.error('OpenAI image generation failed', e);
      throw new ServiceUnavailableException('Не удалось связаться с OpenAI');
    } finally {
      clearTimeout(timer);
    }

    const downloaded = await this.fetchImageBytes(imageUrl);
    const saved = await this.media.saveImageBuffer({
      buffer: downloaded.buffer,
      mime: downloaded.mime,
      originalFilename: `news-cover-${Date.now()}.png`,
      folderId: input.folderId,
      uploadedBy: input.userId,
    });

    return {
      id: saved.id,
      url: saved.url,
      kind: saved.kind,
      folderId: saved.folderId,
      originalFilename: saved.originalFilename,
    };
  }

  private async fetchImageBytes(url: string): Promise<{ buffer: Buffer; mime: string }> {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      throw new ServiceUnavailableException('Не удалось скачать сгенерированное изображение');
    }
    const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim().toLowerCase();
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) {
      throw new ServiceUnavailableException('Пустой ответ при загрузке изображения');
    }
    if (buffer.length > 15 * 1024 * 1024) {
      throw new BadRequestException('Сгенерированное изображение слишком большое');
    }
    return { buffer, mime: mime.startsWith('image/') ? mime : 'image/png' };
  }
}
