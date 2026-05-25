const UPLOAD_PREFIX = '/uploads/media/';

/** Collect `/uploads/media/...` paths from a JSON array or scalar field. */
export function collectUploadPathsFromValue(value: unknown, out: Set<string>): void {
  if (typeof value === 'string' && value.startsWith(UPLOAD_PREFIX)) {
    out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.startsWith(UPLOAD_PREFIX)) out.add(item);
    }
  }
}

export function isLocalMediaUrl(url: string): boolean {
  return url.startsWith(UPLOAD_PREFIX);
}

export function isRemoteMediaUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function filenameFromPublicUrl(url: string): string | null {
  if (!isLocalMediaUrl(url)) return null;
  const name = url.slice(UPLOAD_PREFIX.length).split('/').join('');
  return name && !name.includes('..') ? name : null;
}
