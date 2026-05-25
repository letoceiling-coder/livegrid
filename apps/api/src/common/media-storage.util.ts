import { accessSync, constants, existsSync, mkdirSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/** Subdirectories under MEDIA_ROOT (persistent storage root). */
export const MEDIA_STORAGE_SUBDIRS = ['media', 'avatars', 'temp', 'exports'] as const;

/** Production default — outside git deploy tree. */
export const DEFAULT_PERSISTENT_MEDIA_ROOT = '/srv/livegrid/uploads';

export function resolveMediaRoot(envValue: string | undefined, cwd = process.cwd()): string {
  const raw = envValue?.trim();
  if (raw) return raw;
  return join(cwd, 'uploads');
}

export function ensureMediaStorageDirs(mediaRoot: string): void {
  for (const sub of MEDIA_STORAGE_SUBDIRS) {
    mkdirSync(join(mediaRoot, sub), { recursive: true });
  }
}

export function isMediaRootWritable(mediaRoot: string): boolean {
  try {
    accessSync(mediaRoot, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Bounded recursive file count (for diagnostics). */
export async function countFilesUnder(
  dir: string,
  maxDepth = 4,
  budget = 50_000,
): Promise<number> {
  if (!existsSync(dir)) return 0;
  let total = 0;

  async function walk(current: string, depth: number): Promise<void> {
    if (total >= budget || depth > maxDepth) return;
    let entries: string[];
    try {
      entries = await readdir(current);
    } catch {
      return;
    }
    for (const name of entries) {
      if (total >= budget) return;
      const full = join(current, name);
      let st;
      try {
        st = await stat(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        await walk(full, depth + 1);
      } else if (st.isFile()) {
        total += 1;
      }
    }
  }

  await walk(dir, 0);
  return total;
}

export async function diskUsageBytes(mediaRoot: string): Promise<number | null> {
  if (!existsSync(mediaRoot)) return null;
  let sum = 0;
  try {
    async function walk(current: string, depth: number): Promise<void> {
      if (depth > 6) return;
      const entries = await readdir(current);
      for (const name of entries) {
        const full = join(current, name);
        const st = await stat(full);
        if (st.isDirectory()) await walk(full, depth + 1);
        else if (st.isFile()) sum += st.size;
      }
    }
    await walk(mediaRoot, 0);
    return sum;
  } catch {
    return null;
  }
}
