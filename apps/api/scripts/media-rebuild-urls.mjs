#!/usr/bin/env node
/**
 * Rebuild news.imageUrl from linked media_files; clear broken local refs.
 *
 *   source /var/www/lg/.env && export MEDIA_ROOT=/srv/livegrid/uploads
 *   node apps/api/scripts/media-rebuild-urls.mjs [--dry-run]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const PREFIX = '/uploads/media/';
const MEDIA_ROOT = process.env.MEDIA_ROOT ?? '/srv/livegrid/uploads';
const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

function diskPath(url) {
  return join(MEDIA_ROOT, 'media', url.slice(PREFIX.length));
}

function localFileOk(url) {
  if (!url?.startsWith(PREFIX)) return Boolean(url);
  try {
    return existsSync(diskPath(url));
  } catch {
    return false;
  }
}

async function main() {
  const newsRows = await prisma.news.findMany({
    select: { id: true, slug: true, imageUrl: true },
    orderBy: { id: 'asc' },
  });

  let updated = 0;
  let cleared = 0;

  for (const row of newsRows) {
    const media = await prisma.mediaFile.findMany({
      where: { entityType: 'NEWS', entityId: row.id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, url: true },
    });
    const firstValid = media.find((m) => localFileOk(m.url))?.url ?? null;
    const currentOk = localFileOk(row.imageUrl);

    let nextUrl = row.imageUrl;
    if (firstValid && (!currentOk || row.imageUrl !== firstValid)) {
      nextUrl = firstValid;
    } else if (!firstValid && row.imageUrl && !currentOk) {
      nextUrl = null;
      cleared += 1;
    } else {
      continue;
    }

    if (!dryRun) {
      await prisma.news.update({ where: { id: row.id }, data: { imageUrl: nextUrl } });
    }
    updated += 1;
    console.log(`${dryRun ? '[dry-run] ' : ''}news ${row.id}: ${row.imageUrl ?? 'null'} → ${nextUrl ?? 'null'}`);
  }

  console.log(JSON.stringify({ dryRun, updated, cleared }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
