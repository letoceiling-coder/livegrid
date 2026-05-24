import { useEffect, useState } from 'react';
import {
  fetchListingDebugBundle,
  isListingDebugEnabled,
  type ListingObservabilitySnapshot,
  type ModerationObservabilitySnapshot,
  type PromotionObservabilitySnapshot,
  type DiscoveryObservabilitySnapshot,
  type TrustObservabilitySnapshot,
  type BillingObservabilitySnapshot,
  type EcosystemObservabilitySnapshot,
} from '@/admin/lib/listing-observability';

export default function ListingDebugOverlay() {
  const [stats, setStats] = useState<ListingObservabilitySnapshot | null>(null);
  const [moderation, setModeration] = useState<ModerationObservabilitySnapshot | null>(null);
  const [promotion, setPromotion] = useState<PromotionObservabilitySnapshot | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryObservabilitySnapshot | null>(null);
  const [trust, setTrust] = useState<TrustObservabilitySnapshot | null>(null);
  const [billing, setBilling] = useState<BillingObservabilitySnapshot | null>(null);
  const [ecosystem, setEcosystem] = useState<EcosystemObservabilitySnapshot | null>(null);
  const enabled = isListingDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      fetchListingDebugBundle()
        .then(({ listings, moderation: mod, promotion: promo, discovery: disc, trust: tr, billing: bill, ecosystem: eco }) => {
          if (!cancelled) {
            setStats(listings);
            setModeration(mod);
            setPromotion(promo);
            setDiscovery(disc);
            setTrust(tr);
            setBilling(bill);
            setEcosystem(eco);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setStats(null);
            setModeration(null);
            setPromotion(null);
            setDiscovery(null);
            setTrust(null);
            setBilling(null);
            setEcosystem(null);
          }
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

  const latencyHours =
    moderation?.avgApprovalLatencyMs != null
      ? (moderation.avgApprovalLatencyMs / 3_600_000).toFixed(1)
      : null;

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
      <p>REV: {stats.byVisibility.REVIEW ?? 0} · REJ: {stats.byVisibility.REJECTED ?? 0}</p>
      <p>orphan: {stats.orphanManual} · unassigned: {stats.unassignedManual}</p>
      <p>stale ({stats.staleThresholdDays}d+): {stats.staleCount}</p>
      <p className={stats.ownershipMismatch > 0 ? 'text-amber-700' : ''}>
        owner mismatch: {stats.ownershipMismatch}
      </p>
      {moderation ? (
        <>
          <p className="font-semibold text-[11px] mt-2 mb-0.5 text-primary">moderation</p>
          <p>queue: {moderation.reviewCount} · pending rev: {moderation.pendingRevisionCount}</p>
          <p>rejected: {moderation.rejectedCount} · approved 14d: {moderation.recentlyApprovedCount}</p>
          <p className={moderation.staleReviewCount > 0 ? 'text-amber-700' : ''}>
            stale ({moderation.staleReviewHours}h+): {moderation.staleReviewCount}
          </p>
          {latencyHours ? <p>avg approve: {latencyHours}h</p> : null}
          <p>conflicts: {moderation.conflictCount}</p>
        </>
      ) : null}
      {promotion ? (
        <>
          <p className="font-semibold text-[11px] mt-2 mb-0.5 text-primary">promotion</p>
          <p>active: {promotion.activePromotedCount}</p>
          <p>VIP: {promotion.byTier.VIP ?? 0} · PRM: {promotion.byTier.PREMIUM ?? 0}</p>
          <p>boost max: {promotion.boostRankMax} · vip max: {promotion.vipRankMax}</p>
          <p className={promotion.expiredNotClearedCount > 0 ? 'text-amber-700' : ''}>
            expired stale: {promotion.expiredNotClearedCount}
          </p>
          <p className={promotion.promotionCollisionCount > 0 ? 'text-red-700' : ''}>
            collisions: {promotion.promotionCollisionCount}
          </p>
        </>
      ) : null}
      {discovery ? (
        <>
          <p className="font-semibold text-[11px] mt-2 mb-0.5 text-primary">discovery</p>
          <p>related: {discovery.relatedQueryMs}ms · feed: {discovery.feedQueryMs}ms</p>
          <p>cache: {discovery.cacheHits}/{discovery.cacheHits + discovery.cacheMisses}</p>
          <p>signals: {discovery.lastSignals.slice(0, 4).join(', ') || '—'}</p>
        </>
      ) : null}
      {trust ? (
        <>
          <p className="font-semibold text-[11px] mt-2 mb-0.5 text-primary">trust</p>
          <p>avg quality: {trust.avgQualityScore}</p>
          <p>flagged: {trust.flaggedListings} · dup: {trust.duplicateWarnings}</p>
          <p>reject rate: {trust.rejectRate}% · anomalies: {trust.anomalyCount}</p>
          <p>fetch: {trust.scanMs.toFixed(0)}ms</p>
        </>
      ) : null}
      {billing ? (
        <>
          <p className="font-semibold text-[11px] mt-2 mb-0.5 text-primary">billing</p>
          <p>subs: {billing.activeSubscriptions} · overdue: {billing.overdueInvoices}</p>
          <p>rev 30d: {(billing.promotionRevenue30dRub / 1000).toFixed(0)}k ₽</p>
          <p>pending: {billing.pendingPromotionOrders} · pressure: {billing.quotaPressureHint}</p>
          <p>fetch: {billing.fetchMs.toFixed(0)}ms</p>
        </>
      ) : null}
      {ecosystem ? (
        <>
          <p className="font-semibold text-[11px] mt-2 mb-0.5 text-primary">ecosystem</p>
          <p>agencies: {ecosystem.publishedAgencies} · agents: {ecosystem.publishedAgents}</p>
          <p>loads: {ecosystem.profileLoads} · last: {ecosystem.lastProfileLoadMs}ms</p>
          <p>rank: {ecosystem.lastRankMs}ms · cache: {ecosystem.discoveryCacheHits}/{ecosystem.discoveryCacheHits + ecosystem.discoveryCacheMisses}</p>
          <p>fetch: {ecosystem.fetchMs.toFixed(0)}ms</p>
        </>
      ) : null}
    </div>
  );
}
