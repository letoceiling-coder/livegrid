#!/usr/bin/env node
/**
 * CLI: media integrity report (run on server with DATABASE_URL + MEDIA_ROOT).
 *   cd /var/www/lg && source deploy/load-api-env.sh
 *   node apps/api/scripts/reconcile-media-storage.mjs
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const MEDIA_ROOT = process.env.MEDIA_ROOT ?? '/srv/livegrid/uploads';
const PREFIX = '/uploads/media/';

function diskPath(url) {
  const name = url.slice(PREFIX.length);
  return join(MEDIA_ROOT, 'media', name);
}

const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.mediaFile.findMany({
    take: 200,
    orderBy: { id: 'desc' },
    select: { id: true, url: true },
  });
  let missing = 0;
  for (const row of sample) {
    if (!row.url.startsWith(PREFIX)) continue;
    if (!existsSync(diskPath(row.url))) missing += 1;
  }

  const houses = await prisma.listingHouse.findMany({
    where: { photoUrl: { startsWith: PREFIX } },
    select: { listingId: true, photoUrl: true, extraPhotoUrls: true },
  });
  const brokenListings = [];
  for (const h of houses) {
    const urls = [h.photoUrl, ...(Array.isArray(h.extraPhotoUrls) ? h.extraPhotoUrls : [])].filter(
      (u) => typeof u === 'string' && u.startsWith(PREFIX),
    );
    const miss = urls.filter((u) => !existsSync(diskPath(u)));
    if (miss.length) brokenListings.push({ listingId: h.listingId, missing: miss.length });
  }

  const onDisk = await import('node:fs/promises').then((fs) =>
    fs.readdir(join(MEDIA_ROOT, 'media')).then((n) => n.length).catch(() => 0),
  );

  console.log(
    JSON.stringify(
      {
        mediaRoot: MEDIA_ROOT,
        onDiskMediaFiles: onDisk,
        dbSampled: sample.length,
        dbMissingOnDisk: missing,
        brokenLocalHouseListings: brokenListings,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
