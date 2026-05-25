import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ensureMediaStorageDirs,
  isMediaRootWritable,
  resolveMediaRoot,
} from './media-storage.util';

describe('media-storage.util', () => {
  it('resolves env MEDIA_ROOT when set', () => {
    expect(resolveMediaRoot('/srv/livegrid/uploads')).toBe('/srv/livegrid/uploads');
  });

  it('creates required subdirectories', () => {
    const root = mkdtempSync(join(tmpdir(), 'lg-uploads-'));
    try {
      ensureMediaStorageDirs(root);
      expect(isMediaRootWritable(root)).toBe(true);
      writeFileSync(join(root, 'media', 'test.txt'), 'ok');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
