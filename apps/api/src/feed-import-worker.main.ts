import './instrument';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FeedImportWorkerModule } from './feed-import-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(FeedImportWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  const log = new Logger('FeedImportWorker');
  log.log('Feed import worker online (BullMQ processor, no HTTP)');

  const shutdown = async (signal: string) => {
    log.warn(`Shutting down (${signal})…`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
