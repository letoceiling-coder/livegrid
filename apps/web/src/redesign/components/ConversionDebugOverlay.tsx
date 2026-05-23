import { useEffect, useState } from 'react';
import {
  isConversionDebugEnabled,
  subscribeConversionStats,
  type ConversionSnapshot,
} from '@/redesign/lib/conversion-observability';

const ConversionDebugOverlay = () => {
  const [stats, setStats] = useState<ConversionSnapshot | null>(null);
  const enabled = isConversionDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    return subscribeConversionStats(setStats);
  }, [enabled]);

  if (!enabled || !stats) return null;

  const completionRate =
    stats.formSubmits > 0 ? ((stats.formSuccesses / stats.formSubmits) * 100).toFixed(0) : '—';

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-2 z-[90] max-w-[220px] rounded-lg border border-border/80 bg-background/95 px-2.5 py-2 font-mono text-[10px] leading-relaxed shadow-md backdrop-blur-sm lg:bottom-4"
      aria-hidden="true"
    >
      <p className="font-semibold text-[11px] mb-1 text-primary">conversion_debug</p>
      <p>cta clicks: {stats.ctaClicks}</p>
      <p>phone: {stats.phoneClicks} · consult: {stats.consultationOpens}</p>
      <p>forms: {stats.formSubmits} · ok: {stats.formSuccesses} · err: {stats.formErrors}</p>
      <p>completion: {completionRate}%</p>
      <p>favorites: {stats.favoriteToggles} · share: {stats.shareActions}</p>
      <p>modal: {stats.modalOpenLatencyMs.toFixed(1)}ms</p>
      <p className="truncate">last: {stats.lastAction || '—'} @ {stats.lastSurface || '—'}</p>
    </div>
  );
};

export default ConversionDebugOverlay;
