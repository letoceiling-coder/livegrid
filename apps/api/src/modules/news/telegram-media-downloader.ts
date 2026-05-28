import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, promises as fs, statSync } from 'node:fs';
import { join } from 'node:path';

export const MEDIA_PUBLIC_PREFIX = '/uploads/media/';
export const TELEGRAM_DOWNLOAD_TIMEOUT_MS = 45_000;
export const TELEGRAM_DOWNLOAD_MAX_RETRIES = 3;

export type TelegramDownloadClient = {
  downloadMedia?: (target: unknown, opts?: Record<string, unknown>) => Promise<unknown>;
};

export function resolveTelegramDownloadTarget(msg: unknown): unknown | null {
  if (!msg || typeof msg !== 'object') return null;
  const root = msg as Record<string, unknown>;
  const directPhoto = 'photo' in root ? root.photo : null;
  const media = 'media' in root ? root.media : null;
  const webpagePhoto =
    media && typeof media === 'object' && media !== null && 'webpage' in media
      ? (media as { webpage?: { photo?: unknown } }).webpage?.photo ?? null
      : null;
  const target = webpagePhoto || directPhoto || media;
  return target ?? null;
}

export function toMediaBuffer(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
  return null;
}

export function detectImageExtension(buffer: Buffer): '.jpg' | '.png' | '.webp' | '.gif' {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return '.png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  if (buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif';
  return '.jpg';
}

export function diskPathFromPublicUrl(mediaRoot: string, url: string): string {
  if (!url.startsWith(MEDIA_PUBLIC_PREFIX)) {
    throw new Error(`Not a local media URL: ${url}`);
  }
  const name = url.slice(MEDIA_PUBLIC_PREFIX.length).split('/').join('');
  if (!name || name.includes('..')) throw new Error(`Invalid media URL: ${url}`);
  return join(mediaRoot, 'media', name);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function verifyFileOnDisk(absPath: string, expectedMinBytes = 64): boolean {
  try {
    const st = statSync(absPath);
    return st.isFile() && st.size >= expectedMinBytes;
  } catch {
    return false;
  }
}

/** Persist bytes under mediaRoot; optionally reuse an existing public URL path. */
export async function saveLocalMediaFile(
  mediaRoot: string,
  buffer: Buffer,
  opts?: { publicUrl?: string | null; ext?: string },
): Promise<{ url: string; absPath: string; sizeBytes: number }> {
  if (buffer.length < 64) {
    throw new Error('Image buffer too small');
  }
  const ext = opts?.ext ?? detectImageExtension(buffer);
  let url = opts?.publicUrl?.trim() || null;
  if (url && !url.startsWith(MEDIA_PUBLIC_PREFIX)) {
    throw new Error(`Refusing to overwrite non-local URL: ${url}`);
  }
  if (!url) {
    url = `${MEDIA_PUBLIC_PREFIX}${randomUUID()}${ext}`;
  }
  const absPath = diskPathFromPublicUrl(mediaRoot, url);
  mkdirSync(join(mediaRoot, 'media'), { recursive: true });
  await fs.writeFile(absPath, buffer);
  if (!verifyFileOnDisk(absPath, 64)) {
    throw new Error(`Write verification failed: ${absPath}`);
  }
  return { url, absPath, sizeBytes: buffer.length };
}

export async function downloadTelegramMessagePhoto(
  client: TelegramDownloadClient,
  msg: unknown,
  opts?: { timeoutMs?: number; maxRetries?: number },
): Promise<Buffer | null> {
  if (typeof client.downloadMedia !== 'function') return null;
  const target = resolveTelegramDownloadTarget(msg);
  if (!target) return null;

  const timeoutMs = opts?.timeoutMs ?? TELEGRAM_DOWNLOAD_TIMEOUT_MS;
  const maxRetries = opts?.maxRetries ?? TELEGRAM_DOWNLOAD_MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const mediaPromise = client.downloadMedia(target, {});
      void mediaPromise.catch(() => undefined);
      const raw = await withTimeout(
        mediaPromise,
        timeoutMs,
        `Telegram media download timeout (${timeoutMs}ms, attempt ${attempt}/${maxRetries})`,
      );
      const buffer = toMediaBuffer(raw);
      if (buffer && buffer.length >= 64) return buffer;
      lastError = new Error('Empty or invalid Telegram media buffer');
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  if (lastError) throw lastError;
  return null;
}
