#!/usr/bin/env node
/**
 * Emergency restore: write image bytes to existing /uploads/media/{uuid} paths
 * referenced by a listing (keeps DB URLs unchanged).
 *
 *   node apps/api/scripts/restore-listing-local-media.mjs \
 *     --listing 366362 \
 *     --from-url "https://example.com/photo.jpg"
 *
 * Requires DATABASE_URL and MEDIA_ROOT (source deploy/load-api-env.sh).
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const PREFIX = '/uploads/media/';

function parseArgs(argv) {
  let listingId = null;
  const fromUrls = [];
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--listing') listingId = Number(argv[++i]);
    else if (argv[i] === '--from-url') fromUrls.push(argv[++i]);
  }
  if (!listingId || !fromUrls.length) {
    console.error('Usage: --listing <id> --from-url <url> [--from-url ...]');
    process.exit(2);
  }
  return { listingId, fromUrls };
}

function collectLocalUrls(house) {
  const urls = new Set();
  if (house?.photoUrl?.startsWith(PREFIX)) urls.add(house.photoUrl);
  const extras = house?.extraPhotoUrls;
  if (Array.isArray(extras)) {
    for (const u of extras) {
      if (typeof u === 'string' && u.startsWith(PREFIX)) urls.add(u);
    }
  }
  return [...urls];
}

async function download(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LiveGrid-MediaRestore/1.0' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const prisma = new PrismaClient();
const mediaRoot = process.env.MEDIA_ROOT ?? '/srv/livegrid/uploads';

async function main() {
  const { listingId, fromUrls } = parseArgs(process.argv);
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { house: true, apartment: true, land: true, commercial: true, parking: true },
  });
  if (!listing) throw new Error(`Listing ${listingId} not found`);

  const entity = listing.house ?? listing.apartment ?? listing.land ?? listing.commercial ?? listing.parking;
  const targets = collectLocalUrls(entity);
  if (!targets.length) throw new Error('No local /uploads/media/ refs on listing');

  const buffers = [];
  for (const u of fromUrls) buffers.push(await download(u));

  const mediaDir = join(mediaRoot, 'media');
  mkdirSync(mediaDir, { recursive: true });

  let i = 0;
  for (const publicUrl of targets) {
    const buf = buffers[i % buffers.length];
    const name = publicUrl.slice(PREFIX.length);
    const disk = join(mediaDir, name);
    mkdirSync(dirname(disk), { recursive: true });
    await fs.writeFile(disk, buf);
    i += 1;
    console.log(`wrote ${disk} (${buf.length} bytes)`);
  }

  console.log(JSON.stringify({ listingId, restored: targets.length, mediaRoot }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
