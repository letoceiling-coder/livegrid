import { Injectable } from '@nestjs/common';

type MapQuerySample = {
  at: number;
  kind: 'blocks' | 'listings';
  queryMs: number;
  returned: number;
  detailLevel: string;
};

const SLOW_QUERY_MS = 500;
const RETENTION_MS = 3_600_000;

@Injectable()
export class MapMetricsService {
  private samples: MapQuerySample[] = [];

  record(args: Omit<MapQuerySample, 'at'>) {
    const now = Date.now();
    this.samples.push({ at: now, ...args });
    const cutoff = now - RETENTION_MS;
    if (this.samples.length > 5000) {
      this.samples = this.samples.slice(-2000);
    }
    this.samples = this.samples.filter((s) => s.at >= cutoff);
  }

  getSnapshot() {
    const now = Date.now();
    const minuteAgo = now - 60_000;
    const recent = this.samples.filter((s) => s.at >= minuteAgo);
    const avgMs =
      recent.length > 0
        ? Math.round(recent.reduce((sum, s) => sum + s.queryMs, 0) / recent.length)
        : 0;
    const slowLastMin = recent.filter((s) => s.queryMs >= SLOW_QUERY_MS).length;
    const byKind = {
      blocks: recent.filter((s) => s.kind === 'blocks').length,
      listings: recent.filter((s) => s.kind === 'listings').length,
    };
    const lastReturned =
      recent.length > 0 ? recent[recent.length - 1]!.returned : 0;

    return {
      requestsLastMin: recent.length,
      avgQueryMs: avgMs,
      slowQueriesLastMin: slowLastMin,
      activeKind: byKind,
      lastReturned,
      totalSamples: this.samples.length,
      slowThresholdMs: SLOW_QUERY_MS,
    };
  }
}
