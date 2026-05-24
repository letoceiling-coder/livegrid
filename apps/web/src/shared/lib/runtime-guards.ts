/** DEV-only invariants — no production console noise (Iter 84). */

const isDev = import.meta.env.DEV;

export function invariantArray(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (isDev) {
    console.warn(`[runtime-guard] expected array: ${label}`);
  }
  return [];
}

export function invariantObject(value: unknown, label: string): Record<string, unknown> | null {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (isDev) {
    console.warn(`[runtime-guard] expected object: ${label}`);
  }
  return null;
}
