import { describe, expect, it } from 'vitest';
import {
  collectUploadPathsFromValue,
  filenameFromPublicUrl,
  isLocalMediaUrl,
} from './listing-media-urls.util.js';

describe('listing-media-urls.util', () => {
  it('detects local media urls', () => {
    expect(isLocalMediaUrl('/uploads/media/x.jpg')).toBe(true);
    expect(isLocalMediaUrl('https://x/y.jpg')).toBe(false);
  });

  it('collects paths from extra array', () => {
    const out = new Set<string>();
    collectUploadPathsFromValue(
      ['/uploads/media/a.jpeg', 'https://remote/x.jpg', '/uploads/media/b.jpeg'],
      out,
    );
    expect([...out]).toEqual(['/uploads/media/a.jpeg', '/uploads/media/b.jpeg']);
  });

  it('extracts filename', () => {
    expect(filenameFromPublicUrl('/uploads/media/uuid.jpeg')).toBe('uuid.jpeg');
  });
});
