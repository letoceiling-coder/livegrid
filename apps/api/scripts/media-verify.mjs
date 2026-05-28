#!/usr/bin/env node
/**
 * Media integrity verify: DB vs disk, listings, Telegram news.
 *
 *   source /var/www/lg/.env && export MEDIA_ROOT=/srv/livegrid/uploads
 *   node apps/api/scripts/media-verify.mjs
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const MEDIA_ROOT = process.env.MEDIA_ROOT ?? '/srv/livegrid/uploads';
const PREFIX = '/uploads/media/';

function diskPath(url) {
  return join(MEDIA_ROOT, 'media', url.slice(PREFIX.length));
}

const prisma = new PrismaClient();

async function main() {
  const mediaDir = join(MEDIA_ROOT, 'media');
  const onDiskNames = existsSync(mediaDir) ? await readdir(mediaDir).catch(() => []) : [];
  const onDisk = onDiskNames.length;

  const dbTotal = await prisma.mediaFile.count();
  const sample = await prisma.mediaFile.findMany({
    take: 500,
    orderBy: { id: 'desc' },
    select: { id: true, url: true, entityType: true, entityId: true },
  });

  let missingOnDisk = 0;
  const sampleMissing = [];
  for (const row of sample) {
    if (!row.url.startsWith(PREFIX)) continue;
    if (!existsSync(diskPath(row.url))) {
      missingOnDisk += 1;
      if (sampleMissing.length < 10) sampleMissing.push(row);
    }
  }

  const tgNews = await prisma.news.findMany({
    where: { source: 'TELEGRAM_CHANNEL' },
    select: { id: true, slug: true, imageUrl: true },
  });
  const tgBroken = [];
  for (const n of tgNews) {
    if (!n.imageUrl) {
      tgBroken.push({ id: n.id, slug: n.slug, reason: 'no_imageUrl' });
      continue;
    }
    if (n.imageUrl.startsWith(PREFIX) && !existsSync(diskPath(n.imageUrl))) {
      tgBroken.push({ id: n.id, slug: n.slug, reason: 'missing_file', imageUrl: n.imageUrl });
    }
  }

  const houses = await prisma.listingHouse.findMany({
    where: { photoUrl: { startsWith: PREFIX } },
    select: { listingId: true, photoUrl: true },
    take: 200,
  });
  const brokenListings = houses.filter((h) => h.photoUrl && !existsSync(diskPath(h.photoUrl))).map((h) => h.listingId);

  const report = {
    scannedAt: new Date().toISOString(),
    mediaRoot: MEDIA_ROOT,
    mediaRootExists: existsSync(MEDIA_ROOT),
    onDiskMediaFiles: onDisk,
    dbMediaFiles: dbTotal,
    dbSampled: sample.length,
    dbMissingOnDisk: missingOnDisk,
    sampleMissingUrls: sampleMissing.map((r) => r.url),
    telegramNews: { total: tgNews.length, broken: tgBroken.length, brokenItems: tgBroken },
    brokenLocalHouseListings: brokenListings,
    healthy: missingOnDisk === 0 && tgBroken.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.healthy ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
