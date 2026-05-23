/** Rolling sample helpers for DEV stress validation (Iter 26) */

export const STRESS_MAX_SAMPLES = 120;

export function pushSample(samples: number[], value: number): number[] {
  const next = [...samples, value];
  if (next.length > STRESS_MAX_SAMPLES) next.shift();
  return next;
}

export function sampleAvg(samples: number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

export function samplePercentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function sampleMin(samples: number[]): number {
  if (samples.length === 0) return 0;
  return Math.min(...samples);
}

/** Conservative per-placemark DOM + Yandex object estimate */
export const PLACEMARK_EST_BYTES = 2048;

export function estimatePlacemarkMemoryKb(count: number): number {
  return Math.round((count * PLACEMARK_EST_BYTES) / 1024);
}

export type PerformanceThreshold = 'green' | 'yellow' | 'red';

export function thresholdClass(
  value: number,
  greenMax: number,
  yellowMax: number,
): PerformanceThreshold {
  if (value <= greenMax) return 'green';
  if (value <= yellowMax) return 'yellow';
  return 'red';
}

export function thresholdFpsClass(fps: number): PerformanceThreshold {
  if (fps >= 50) return 'green';
  if (fps >= 30) return 'yellow';
  return 'red';
}

/** Iter 26 — documented thresholds for manual stress validation */
export const STRESS_THRESHOLDS = {
  clusterRebuildMs: { green: 500, yellow: 2000 },
  fps: { green: 50, yellow: 30 },
  popupLatencyMs: { green: 16, yellow: 50 },
  markerClickMs: { green: 8, yellow: 32 },
  bboxRequestsPerMin: { green: 20, yellow: 60 },
  heapUsedMb: { green: 150, yellow: 350 },
} as const;

export function readJsHeapMb(): { used: number | null; limit: number | null } {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
    .memory;
  if (!mem) return { used: null, limit: null };
  return {
    used: Math.round((mem.usedJSHeapSize / 1024 / 1024) * 10) / 10,
    limit: Math.round((mem.jsHeapSizeLimit / 1024 / 1024) * 10) / 10,
  };
}
