import { useEffect, useState } from 'react';
import {
  fetchListingObservability,
  isListingDebugEnabled,
  type ListingObservabilitySnapshot,
} from '@/admin/lib/listing-observability';

export default function ListingDebugOverlay() {
  const [stats, setStats] = useState<ListingObservabilitySnapshot | null>(null);
  const enabled = isListingDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      fetchListingObservability()
        .then((s) => {
          if (!cancelled) setStats(s);
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        });
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  if (!enabled || !stats) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-2 z-[99] max-w-[240px] rounded-lg border border-border/80 bg-background/95 px-2.5 py-2 font-mono text-[10px] shadow-md backdrop-blur-sm max-sm:bottom-36 max-sm:max-w-[200px]"
      aria-hidden="true"
    >
      <p className="font-semibold text-[11px] mb-1 text-primary">listing_debug</p>
      <p>query: {stats.queryMs}ms</p>
      <p>FEED: {stats.bySource.FEED ?? 0} · MANUAL: {stats.bySource.MANUAL ?? 0}</p>
      <p>PUB: {stats.byVisibility.PUBLIC ?? 0} · HID: {stats.byVisibility.HIDDEN ?? 0}</p>
      <p>DRF: {stats.byVisibility.DRAFT ?? 0} · ARC: {stats.byVisibility.ARCHIVED ?? 0}</p>
      <p>orphan: {stats.orphanManual} · unassigned: {stats.unassignedManual}</p>
      <p>stale ({stats.staleThresholdDays}d+): {stats.staleCount}</p>
      <p className={stats.ownershipMismatch > 0 ? 'text-amber-700' : ''}>
        owner mismatch: {stats.ownershipMismatch}
      </p>
    </div>
  );
}
