#!/usr/bin/env node
/**
 * Repair Telegram news images: re-download via MTProto and write to persistent MEDIA_ROOT.
 *
 *   source /var/www/lg/.env
 *   export MEDIA_ROOT=/srv/livegrid/uploads
 *   node apps/api/scripts/telegram-repair-images.mjs [--limit 30] [--dry-run]
 */
import { existsSync, readFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const PREFIX = '/uploads/media/';
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadDotEnv(join(__dirname, '..', '..', '..', '.env'));

const MEDIA_ROOT = process.env.MEDIA_ROOT ?? '/srv/livegrid/uploads';
const limitArg = Number(process.argv.find((a, i) => process.argv[i - 1] === '--limit') ?? '30');
const limit = Math.max(1, Math.min(200, Number.isFinite(limitArg) ? limitArg : 30));
const dryRun = process.argv.includes('--dry-run');

function diskPath(url) {
  const name = url.slice(PREFIX.length);
  return join(MEDIA_ROOT, 'media', name);
}

function fileMissing(url) {
  if (!url?.startsWith(PREFIX)) return false;
  try {
    const st = existsSync(diskPath(url));
    return !st;
  } catch {
    return true;
  }
}

function parsePostUrl(url) {
  const m = String(url ?? '').trim().match(/^https?:\/\/t\.me\/([^/?#]+)\/(\d+)/i);
  if (!m) return null;
  let channel = m[1];
  if (!channel.startsWith('@') && !/^-?\d+$/.test(channel)) channel = `@${channel.toLowerCase()}`;
  return { channelRef: channel, messageId: Number(m[2]) };
}

async function getSession(prisma) {
  const env = (process.env.TG_SESSION_STRING ?? '').trim();
  if (env) return env;
  const row = await prisma.siteSetting.findUnique({ where: { key: 'tg_news_mtproto_session' } });
  return (row?.value ?? '').trim();
}

function detectExt(buffer) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return '.png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF') return '.webp';
  return '.jpg';
}

async function withTimeout(promise, ms, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function downloadPhoto(client, msg, attempt = 1) {
  const root = msg && typeof msg === 'object' ? msg : null;
  if (!root) return null;
  const media = root.media ?? root.photo ?? msg;
  const timeoutMs = 45_000;
  try {
    const raw = await withTimeout(
      client.downloadMedia(media, {}),
      timeoutMs,
      `Telegram media download timeout (${timeoutMs}ms)`,
    );
    const buffer = Buffer.isBuffer(raw) ? raw : raw instanceof Uint8Array ? Buffer.from(raw) : null;
    if (buffer && buffer.length >= 64) return buffer;
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return downloadPhoto(client, msg, attempt + 1);
    }
    throw e;
  }
  return null;
}

function saveBuffer(buffer, reuseUrl) {
  const ext = detectExt(buffer);
  const url = reuseUrl?.startsWith(PREFIX) ? reuseUrl : `${PREFIX}${randomUUID()}${ext}`;
  const disk = diskPath(url);
  mkdirSync(join(MEDIA_ROOT, 'media'), { recursive: true });
  writeFileSync(disk, buffer);
  const st = statSync(disk);
  if (!st.isFile() || st.size < 64) throw new Error(`verify failed: ${disk}`);
  return { url, sizeBytes: st.size };
}

async function main() {
  const apiId = Number(process.env.TG_API_ID);
  const apiHash = String(process.env.TG_API_HASH ?? '').trim();
  if (!Number.isInteger(apiId) || !apiHash) {
    console.error('TG_API_ID / TG_API_HASH required');
    process.exit(2);
  }

  const prisma = new PrismaClient();
  const sessionString = await getSession(prisma);
  if (!sessionString) {
    console.error('TG session missing (TG_SESSION_STRING or site_settings.tg_news_mtproto_session)');
    process.exit(2);
  }

  const rows = await prisma.news.findMany({
    where: { source: 'TELEGRAM_CHANNEL', sourceUrl: { not: null } },
    orderBy: { id: 'desc' },
    take: limit * 4,
    select: { id: true, slug: true, sourceUrl: true, imageUrl: true },
  });

  const candidates = [];
  for (const row of rows) {
    const media = await prisma.mediaFile.findMany({
      where: { entityType: 'NEWS', entityId: row.id },
      select: { id: true, url: true },
    });
    const missingMedia = media.filter((m) => fileMissing(m.url));
    const imageMissing = !row.imageUrl || fileMissing(row.imageUrl);
    if (!imageMissing && missingMedia.length === 0) continue;
    candidates.push({ ...row, missingMedia });
    if (candidates.length >= limit) break;
  }

  console.log(JSON.stringify({ dryRun, mediaRoot: MEDIA_ROOT, candidates: candidates.length }, null, 2));
  if (dryRun) {
    for (const c of candidates) {
      console.log(`- news ${c.id} ${c.slug} imageMissing=${fileMissing(c.imageUrl)} missingMedia=${c.missingMedia.length}`);
    }
    await prisma.$disconnect();
    return;
  }

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 5 });
  let updated = 0;
  let failed = 0;

  try {
    await client.connect();
    if (!(await client.checkAuthorization())) throw new Error('MTProto session not authorized');

    for (const row of candidates) {
      const parsed = parsePostUrl(row.sourceUrl);
      if (!parsed) {
        failed += 1;
        continue;
      }
      try {
        const entity = await client.getEntity(parsed.channelRef);
        const loaded = await client.getMessages(entity, { ids: [parsed.messageId] });
        const msg = Array.isArray(loaded) ? loaded[0] : loaded;
        if (!msg) {
          failed += 1;
          continue;
        }
        const buffer = await downloadPhoto(client, msg);
        if (!buffer) {
          failed += 1;
          continue;
        }
        const reuseUrl = row.missingMedia[0]?.url ?? row.imageUrl;
        const saved = saveBuffer(buffer, reuseUrl?.startsWith(PREFIX) ? reuseUrl : null);

        if (row.missingMedia[0]?.id) {
          await prisma.mediaFile.update({
            where: { id: row.missingMedia[0].id },
            data: { url: saved.url, sizeBytes: BigInt(saved.sizeBytes), entityType: 'NEWS', entityId: row.id },
          });
        } else {
          await prisma.mediaFile.create({
            data: {
              kind: 'PHOTO',
              url: saved.url,
              sizeBytes: BigInt(saved.sizeBytes),
              entityType: 'NEWS',
              entityId: row.id,
              originalFilename: `tg-repair-${row.id}.jpg`,
            },
          });
        }
        await prisma.news.update({ where: { id: row.id }, data: { imageUrl: saved.url } });
        updated += 1;
        console.log(`OK news ${row.id} → ${saved.url} (${saved.sizeBytes} bytes)`);
      } catch (e) {
        failed += 1;
        console.error(`FAIL news ${row.id}:`, e instanceof Error ? e.message : e);
      }
    }
  } finally {
    await client.disconnect();
    await prisma.$disconnect();
  }

  console.log(JSON.stringify({ updated, failed }, null, 2));
  process.exit(failed > 0 && updated === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
