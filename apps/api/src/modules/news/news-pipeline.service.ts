import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NewsWorkflowStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { AiRewriteService } from '../ai-settings/ai-rewrite.service';
import { NewsService } from './news.service';
import {
  NEWS_PIPELINE_QUEUE,
  NEWS_JOB_IMPORT,
  NEWS_JOB_REWRITE,
  NEWS_JOB_REWRITE_BULK,
  NEWS_JOB_PUBLISH,
  NEWS_JOB_PUBLISH_BULK,
  type NewsImportJob,
  type NewsRewriteJob,
  type NewsRewriteBulkJob,
  type NewsPublishJob,
  type NewsPublishBulkJob,
} from './news-pipeline.constants';

@Injectable()
export class NewsPipelineService {
  private readonly log = new Logger(NewsPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly news: NewsService,
    private readonly aiSettings: AiSettingsService,
    private readonly aiRewrite: AiRewriteService,
    @InjectQueue(NEWS_PIPELINE_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueueImport(body?: { onlyChannelIds?: number[] | null; limitPerChannel?: number | null }) {
    const job = await this.queue.add(
      NEWS_JOB_IMPORT,
      {
        kind: NEWS_JOB_IMPORT,
        onlyChannelIds: body?.onlyChannelIds ?? null,
        limitPerChannel: body?.limitPerChannel ?? null,
      } satisfies NewsImportJob,
      { removeOnComplete: 100, removeOnFail: 50, attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );
    return { jobId: job.id, status: 'queued' };
  }

  async enqueueRewrite(newsId: number) {
    const job = await this.queue.add(
      NEWS_JOB_REWRITE,
      { kind: NEWS_JOB_REWRITE, newsId } satisfies NewsRewriteJob,
      { removeOnComplete: 200, removeOnFail: 100, attempts: 1 },
    );
    return { jobId: job.id, newsId, status: 'queued' };
  }

  async enqueueRewriteBulk(body?: { newsIds?: number[] | null; allNew?: boolean }) {
    const job = await this.queue.add(
      NEWS_JOB_REWRITE_BULK,
      {
        kind: NEWS_JOB_REWRITE_BULK,
        newsIds: body?.newsIds ?? null,
        statusFilter: body?.allNew ? 'NEW' : null,
      } satisfies NewsRewriteBulkJob,
      { removeOnComplete: 50, removeOnFail: 50, attempts: 1 },
    );
    return { jobId: job.id, status: 'queued' };
  }

  async enqueuePublish(newsId: number) {
    const job = await this.queue.add(
      NEWS_JOB_PUBLISH,
      { kind: NEWS_JOB_PUBLISH, newsId } satisfies NewsPublishJob,
      { removeOnComplete: 200, removeOnFail: 100, attempts: 2 },
    );
    return { jobId: job.id, newsId, status: 'queued' };
  }

  async enqueuePublishBulk(body?: { newsIds?: number[] | null; allReady?: boolean }) {
    const job = await this.queue.add(
      NEWS_JOB_PUBLISH_BULK,
      { kind: NEWS_JOB_PUBLISH_BULK, newsIds: body?.newsIds ?? null } satisfies NewsPublishBulkJob,
      { removeOnComplete: 50, removeOnFail: 50, attempts: 1 },
    );
    return { jobId: job.id, status: 'queued' };
  }

  async runImportJob(data: NewsImportJob) {
    const result = await this.news.syncFromTelegramChannels({
      onlyChannelIds: data.onlyChannelIds ?? null,
      limitPerChannel: data.limitPerChannel ?? null,
    });
    return result;
  }

  async runRewriteJob(data: NewsRewriteJob) {
    return this.rewriteOne(data.newsId);
  }

  async runRewriteBulkJob(data: NewsRewriteBulkJob) {
    let ids = data.newsIds ?? [];
    if (ids.length === 0 && data.statusFilter === 'NEW') {
      const rows = await this.prisma.news.findMany({
        where: { workflowStatus: 'NEW', deletedAt: null },
        select: { id: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
      ids = rows.map((r) => r.id);
    }
    const results: Array<{ newsId: number; ok: boolean; error?: string }> = [];
    for (const newsId of ids) {
      try {
        await this.rewriteOne(newsId);
        results.push({ newsId, ok: true });
      } catch (e) {
        results.push({
          newsId,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { total: ids.length, results };
  }

  async runPublishJob(data: NewsPublishJob) {
    return this.publishOne(data.newsId);
  }

  async runPublishBulkJob(data: NewsPublishBulkJob) {
    let ids = data.newsIds ?? [];
    if (ids.length === 0) {
      const rows = await this.prisma.news.findMany({
        where: {
          deletedAt: null,
          workflowStatus: { in: ['REWRITTEN', 'DRAFT'] as NewsWorkflowStatus[] },
        },
        select: { id: true },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      });
      ids = rows.map((r) => r.id);
    }
    const results: Array<{ newsId: number; ok: boolean; error?: string }> = [];
    for (const newsId of ids) {
      try {
        await this.publishOne(newsId);
        results.push({ newsId, ok: true });
      } catch (e) {
        results.push({
          newsId,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { total: ids.length, results };
  }

  private async rewriteOne(newsId: number) {
    const row = await this.prisma.news.findFirst({
      where: { id: newsId, deletedAt: null },
    });
    if (!row) throw new NotFoundException(`News ${newsId} not found`);

    const sourceText = row.originalText?.trim() || row.body?.trim();
    if (!sourceText) {
      throw new Error('Нет текста для рерайта');
    }

    const config = await this.aiSettings.getActiveProviderRuntime();
    try {
      const result = await this.aiRewrite.rewriteNewsText(sourceText, config);
      await this.aiSettings.recordUsage(config.provider, result.totalTokens, result.costUsd);

      const rewrittenTitle = this.extractTitle(result.text) || row.title;
      const updated = await this.prisma.news.update({
        where: { id: newsId },
        data: {
          originalText: row.originalText ?? sourceText,
          rewrittenText: result.text,
          body: result.text,
          title: rewrittenTitle,
          workflowStatus: 'REWRITTEN',
          aiProvider: result.provider,
          aiModel: result.model,
          rewriteTokens: result.totalTokens,
          rewriteCostUsd: result.costUsd,
          rewriteDurationMs: result.durationMs,
          errorMessage: null,
        },
      });

      await this.prisma.newsRewriteLog.create({
        data: {
          newsId,
          provider: result.provider,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          costUsd: result.costUsd,
          durationMs: result.durationMs,
          success: true,
        },
      });

      return updated;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.prisma.news.update({
        where: { id: newsId },
        data: { workflowStatus: 'ERROR', errorMessage: msg },
      });
      await this.prisma.newsRewriteLog.create({
        data: {
          newsId,
          provider: config.provider,
          model: config.model,
          success: false,
          errorMessage: msg,
        },
      });
      throw e;
    }
  }

  private async publishOne(newsId: number) {
    const row = await this.prisma.news.findFirst({
      where: { id: newsId, deletedAt: null },
    });
    if (!row) throw new NotFoundException(`News ${newsId} not found`);

    const body = row.rewrittenText?.trim() || row.body?.trim();
    if (!body) throw new Error('Нет текста для публикации');

    const updated = await this.prisma.news.update({
      where: { id: newsId },
      data: {
        isPublished: true,
        workflowStatus: 'PUBLISHED',
        publishedAt: row.publishedAt ?? new Date(),
        body,
        errorMessage: null,
      },
    });

    await this.prisma.newsPublishLog.create({
      data: { newsId, target: 'website', success: true },
    });

    return updated;
  }

  private extractTitle(text: string): string | null {
    const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean);
    if (!firstLine) return null;
    if (firstLine.length > 200) return `${firstLine.slice(0, 197)}…`;
    return firstLine;
  }

  async bulkSoftDelete(ids: number[]) {
    await this.prisma.news.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date(), isPublished: false, workflowStatus: 'DRAFT' },
    });
    return { deleted: ids.length };
  }

  async bulkRestore(ids: number[]) {
    await this.prisma.news.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });
    return { restored: ids.length };
  }
}
