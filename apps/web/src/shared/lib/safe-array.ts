/** Safe array helpers — Iter 84 runtime stabilization. */

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function safeFirst<T>(value: unknown): T | undefined {
  const arr = ensureArray<T>(value);
  return arr[0];
}

export function safeMap<T, U>(value: unknown, fn: (item: T, index: number) => U): U[] {
  return ensureArray<T>(value).map(fn);
}

export function safeFilter<T>(value: unknown, fn: (item: T, index: number) => boolean): T[] {
  return ensureArray<T>(value).filter(fn);
}
