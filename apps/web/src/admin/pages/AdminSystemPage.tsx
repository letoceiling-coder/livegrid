import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bell,
  Bot,
  Database,
  Download,
  Heart,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import CrmInlineError from '@/admin/components/CrmInlineError';
import AdminLoadingState from '@/admin/components/AdminLoadingState';
import AdminStatusBadge from '@/admin/components/AdminStatusBadge';
import { collectClientPlatformDiagnostics } from '@/shared/lib/platform-diagnostics';

type PlatformSnapshot = {
  ok: boolean;
  checkedAt: string;
  pendingMigrations: string[];
  bootWarningsRu: string[];
  issues: { kind: string; messageRu: string; severity: string }[];
};

type Diagnostics = {
  refreshedAt: string;
  computeMs: number;
  api: { status: string; database: string };
  platform?: PlatformSnapshot;
  crm: { openRequests: number; openFollowupTasks: number; unreadNotifications: number };
  moderation: { reviewQueue: number };
  listings: { publicPublished: number };
  automation: { lastScan: { durationMs?: number; tasksCreated?: number } | null };
  trust: { flaggedListings?: number; avgQualityScore?: number } | null;
  billing: {
    overdueInvoices?: number;
    activeSubscriptions?: number;
    promotionRevenue30dRub?: number;
    quotaPressureHint?: string;
  } | null;
  pressure: { queuePressure: number; pollingPressure: string; notificationPressure: number };
  feed?: {
    ok: boolean;
    regions: { enabled: number; stale: { code: string }[] };
    batches: { running: number; stuck: unknown[]; failedLast24h: number; incompleteLast24h: number };
    dataIntegrity: { orphanApartments: number };
    queue: { waiting: number; active: number; failed: number } | null;
    issues: { kind: string; severity: string; messageRu: string }[];
  } | null;
  map?: {
    requestsLastMin: number;
    avgQueryMs: number;
    slowQueriesLastMin: number;
    lastReturned: number;
  };
  sitemap?: {
    indexUrl: string;
    totalUrls: number | null;
    lastGeneration: { generatedAt: string; durationMs: number; counts: { total: number; apartments?: number; complexes?: number } } | null;
  };
  seo?: {
    sitemapIndexUrl: string;
    sitemapTotalUrls: number | null;
    sitemapGeneratedAt: string | null;
    sitemapAgeHours: number | null;
    sitemapStale: boolean;
    catalogPublicListings: number;
    sitemapApartmentUrls: number | null;
    sitemapComplexUrls: number | null;
    landingCoverage?: {
      publicListings: number;
      coveredDistricts: number;
      coveredSubways: number;
      thinDistricts: number;
      orphanDistricts: number;
      indexableLandingPatterns: number;
      crawlDepthHint: number;
    } | null;
  };
  runtime?: {
    memoryMb: { rss: number; heapUsed: number; heapTotal: number };
    nodeEnv: string;
  };
};

type EngagementMetrics = {
  browseEvents7d: number;
  browseUsers7d: number;
  browseEvents30d: number;
  avgBrowseDepth7d: number;
  favoritesTotal: number;
  favoritesUsers: number;
  favoritesAdded7d: number;
  favoritesActivationPct: number;
  savedSearchesTotal: number;
  savedSearchUsers: number;
  returnUserHint: number;
  noteRu: string;
};

type MarketplaceHealth = {
  refreshedAt: string;
  computeMs: number;
  inventory: {
    publicTotal: number;
    feedPublic: number;
    manualPublic: number;
    hiddenActive: number;
    orphanManual: number;
    reviewQueue: number;
    duplicateFeedExternal: number;
  };
  freshness: {
    staleManual30: number;
    staleManual60: number;
    staleManual90: number;
    staleFeedUpdated90: number;
    score: number;
  };
  liquidity: {
    thinDistricts: number;
    lowSupplyDistricts: Array<{ districtId: number; name: string; listingCount: number }>;
    overSaturatedDistricts: Array<{ districtId: number; name: string; listingCount: number }>;
    inactiveBlocks: number;
    promotionActive: number;
    promotionRatioPct: number;
    score: number;
  };
  supplySide: {
    agentsTotal: number;
    inactiveAgents60d: number;
    staleFavoriteListings: number;
  };
};

type ResponsivenessMetrics = {
  responseSlaScore: number;
  sla: { open: number; overdue: number; stale: number };
  latency: { avgFirstContactMinutes: number | null; avgAssignmentMinutes: number | null };
  communication: {
    unreadConversations: number;
    staleConversations: number;
    callbackOverdueCount: number;
    avgReplyMinutes: number | null;
  };
  agents: { fast: number; slow: number; total: number };
  heat: { overdue: number; stale: number; callbacks: number; unread: number };
  bottlenecks: string[];
};

export default function AdminSystemPage() {
  const query = useQuery({
    queryKey: ['admin', 'system', 'diagnostics'],
    queryFn: () => apiGet<Diagnostics>('/admin/system/diagnostics'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const engagementQuery = useQuery({
    queryKey: ['admin', 'retention', 'engagement-metrics'],
    queryFn: () => apiGet<EngagementMetrics>('/admin/retention/engagement-metrics'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const marketplaceQuery = useQuery({
    queryKey: ['admin', 'listings', 'marketplace-health'],
    queryFn: () => apiGet<MarketplaceHealth>('/admin/listings/marketplace-health'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const responsivenessQuery = useQuery({
    queryKey: ['admin', 'requests', 'responsiveness-metrics'],
    queryFn: () => apiGet<ResponsivenessMetrics>('/admin/requests/responsiveness-metrics'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const d = query.data;
  const em = engagementQuery.data;
  const mh = marketplaceQuery.data;
  const rv = responsivenessQuery.data;
  const clientDiag = import.meta.env.DEV ? collectClientPlatformDiagnostics() : null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl pb-24">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            System Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Read-only operational health — no infra changes</p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border text-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {query.isError ? (
        <CrmInlineError
          message="Не удалось загрузить диагностику"
          onRetry={() => void query.refetch()}
          className="mb-4"
        />
      ) : null}

      {query.isLoading ? <AdminLoadingState label="Загрузка диагностики…" /> : null}

      {d ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <Database className="w-3 h-3" /> API
              </p>
              <p className="text-lg font-bold">{d.api.status}</p>
              <p className="text-[10px] text-muted-foreground">db: {d.api.database}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Queue pressure</p>
              <p className="text-lg font-bold">{d.pressure.queuePressure}</p>
              <p className="text-[10px] text-muted-foreground">poll: {d.pressure.pollingPressure}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <Bell className="w-3 h-3" /> Notifications
              </p>
              <p className="text-lg font-bold">{d.pressure.notificationPressure}</p>
            </div>
            <div className="rounded-xl border p-3 bg-card">
              <p className="text-[10px] uppercase text-muted-foreground">Compute</p>
              <p className="text-lg font-bold">{d.computeMs}ms</p>
            </div>
          </div>

          {em ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Engagement & retention
                </h2>
                <AdminStatusBadge tone={em.avgBrowseDepth7d >= 2 ? 'ok' : 'warn'}>
                  depth {em.avgBrowseDepth7d}
                </AdminStatusBadge>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Browse 7d</dt>
                  <dd className="font-medium tabular-nums">{em.browseEvents7d.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Browse users 7d</dt>
                  <dd className="font-medium tabular-nums">{em.browseUsers7d.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Avg depth 7d</dt>
                  <dd className="font-medium tabular-nums">{em.avgBrowseDepth7d}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Browse 30d</dt>
                  <dd className="font-medium tabular-nums">{em.browseEvents30d.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Favorites
                  </dt>
                  <dd className="font-medium tabular-nums">{em.favoritesTotal.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fav users</dt>
                  <dd className="font-medium tabular-nums">{em.favoritesUsers.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fav added 7d</dt>
                  <dd className="font-medium tabular-nums">{em.favoritesAdded7d.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fav activation %</dt>
                  <dd className={cn('font-medium tabular-nums', em.favoritesActivationPct < 15 && 'text-amber-700')}>
                    {em.favoritesActivationPct}%
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saved searches</dt>
                  <dd className="font-medium tabular-nums">{em.savedSearchesTotal.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">SS users</dt>
                  <dd className="font-medium tabular-nums">{em.savedSearchUsers.toLocaleString('ru-RU')}</dd>
                </div>
              </dl>
              <p className="text-[10px] text-muted-foreground">{em.noteRu}</p>
            </section>
          ) : engagementQuery.isLoading ? (
            <div className="rounded-xl border bg-card p-4 mb-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Загрузка engagement metrics…
            </div>
          ) : null}

          {mh ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Marketplace inventory & liquidity
                </h2>
                <div className="flex gap-1.5">
                  <AdminStatusBadge tone={mh.freshness.score >= 80 ? 'ok' : 'warn'}>
                    freshness {mh.freshness.score}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone={mh.liquidity.score >= 80 ? 'ok' : 'warn'}>
                    liquidity {mh.liquidity.score}
                  </AdminStatusBadge>
                </div>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Public listings</dt>
                  <dd className="font-medium tabular-nums">{mh.inventory.publicTotal.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">FEED / MANUAL</dt>
                  <dd className="font-medium tabular-nums">
                    {mh.inventory.feedPublic.toLocaleString('ru-RU')} / {mh.inventory.manualPublic.toLocaleString('ru-RU')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stale manual 30d</dt>
                  <dd className={cn('font-medium tabular-nums', mh.freshness.staleManual30 > 0 && 'text-amber-700')}>
                    {mh.freshness.staleManual30.toLocaleString('ru-RU')}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Hidden active</dt>
                  <dd className="font-medium tabular-nums">{mh.inventory.hiddenActive.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Thin districts</dt>
                  <dd className="font-medium tabular-nums">{mh.liquidity.thinDistricts}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Inactive ЖК</dt>
                  <dd className="font-medium tabular-nums">{mh.liquidity.inactiveBlocks.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Promoted %</dt>
                  <dd className="font-medium tabular-nums">{mh.liquidity.promotionRatioPct}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stale favorites</dt>
                  <dd className="font-medium tabular-nums">{mh.supplySide.staleFavoriteListings.toLocaleString('ru-RU')}</dd>
                </div>
              </dl>
              {mh.liquidity.lowSupplyDistricts.length > 0 ? (
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                  <span className="font-medium text-foreground">Low supply: </span>
                  {mh.liquidity.lowSupplyDistricts
                    .map((d) => `${d.name} (${d.listingCount})`)
                    .join(' · ')}
                </div>
              ) : null}
              <Link to="/admin/feed-import" className="text-xs text-primary hover:underline inline-block">
                Feed Import / data quality →
              </Link>
            </section>
          ) : marketplaceQuery.isLoading ? (
            <div className="rounded-xl border bg-card p-4 mb-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Загрузка marketplace health…
            </div>
          ) : null}

          {rv ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Lead velocity & responsiveness
                </h2>
                <AdminStatusBadge tone={rv.responseSlaScore >= 80 ? 'ok' : 'warn'}>
                  SLA {rv.responseSlaScore}
                </AdminStatusBadge>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Avg first contact</dt>
                  <dd className="font-medium tabular-nums">
                    {rv.latency.avgFirstContactMinutes != null ? `${rv.latency.avgFirstContactMinutes} мин` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Avg assignment</dt>
                  <dd className="font-medium tabular-nums">
                    {rv.latency.avgAssignmentMinutes != null ? `${rv.latency.avgAssignmentMinutes} мин` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Overdue / stale</dt>
                  <dd className={cn('font-medium tabular-nums', rv.sla.overdue > 0 && 'text-red-600')}>
                    {rv.sla.overdue} / {rv.sla.stale}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Callbacks overdue</dt>
                  <dd className={cn('font-medium tabular-nums', rv.communication.callbackOverdueCount > 0 && 'text-amber-700')}>
                    {rv.communication.callbackOverdueCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Unread threads</dt>
                  <dd className="font-medium tabular-nums">{rv.communication.unreadConversations}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stale threads</dt>
                  <dd className="font-medium tabular-nums">{rv.communication.staleConversations}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fast / slow agents</dt>
                  <dd className="font-medium tabular-nums">
                    {rv.agents.fast} / {rv.agents.slow}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Avg reply</dt>
                  <dd className="font-medium tabular-nums">
                    {rv.communication.avgReplyMinutes != null ? `${rv.communication.avgReplyMinutes} мин` : '—'}
                  </dd>
                </div>
              </dl>
              {rv.bottlenecks.length > 0 ? (
                <ul className="text-[10px] text-muted-foreground pt-1 border-t border-border space-y-0.5">
                  {rv.bottlenecks.map((b) => (
                    <li key={b}>· {b}</li>
                  ))}
                </ul>
              ) : null}
              <Link to="/admin/requests?sla=overdue" className="text-xs text-primary hover:underline inline-block">
                CRM queue →
              </Link>
            </section>
          ) : responsivenessQuery.isLoading ? (
            <div className="rounded-xl border bg-card p-4 mb-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Загрузка responsiveness metrics…
            </div>
          ) : null}

          <section className="rounded-xl border bg-card p-4 mb-4 space-y-3">
            <h2 className="font-semibold text-sm">CRM & Automation</h2>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-muted-foreground">Open requests</dt><dd className="font-medium">{d.crm.openRequests}</dd></div>
              <div><dt className="text-muted-foreground">Follow-up tasks</dt><dd className="font-medium">{d.crm.openFollowupTasks}</dd></div>
              <div><dt className="text-muted-foreground">Moderation queue</dt><dd className="font-medium">{d.moderation.reviewQueue}</dd></div>
              <div><dt className="text-muted-foreground">Public listings</dt><dd className="font-medium">{d.listings.publicPublished}</dd></div>
            </dl>
            {d.automation.lastScan ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                Last automation scan: {d.automation.lastScan.durationMs ?? '—'}ms · tasks {d.automation.lastScan.tasksCreated ?? 0}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Automation: no in-process scan stats (run cron scan)</p>
            )}
          </section>

          {d.map ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-2">
              <h2 className="font-semibold text-sm">Map viewport</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Req/min</dt><dd className="font-medium">{d.map.requestsLastMin}</dd></div>
                <div><dt className="text-muted-foreground">Avg ms</dt><dd className="font-medium">{d.map.avgQueryMs}</dd></div>
                <div><dt className="text-muted-foreground">Slow</dt><dd className="font-medium">{d.map.slowQueriesLastMin}</dd></div>
                <div><dt className="text-muted-foreground">Last batch</dt><dd className="font-medium">{d.map.lastReturned}</dd></div>
              </dl>
              <Link to="/map" className="text-xs text-primary hover:underline inline-block">
                Open map →
              </Link>
            </section>
          ) : null}

          {d.seo ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-sm">SEO governance</h2>
                <AdminStatusBadge tone={d.seo.sitemapStale ? 'warn' : 'ok'}>
                  {d.seo.sitemapStale ? 'sitemap stale' : 'sitemap ok'}
                </AdminStatusBadge>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Sitemap URLs</dt>
                  <dd className="font-medium tabular-nums">{d.seo.sitemapTotalUrls?.toLocaleString('ru-RU') ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Age (hours)</dt>
                  <dd className="font-medium">{d.seo.sitemapAgeHours ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Apt in sitemap</dt>
                  <dd className="font-medium tabular-nums">{d.seo.sitemapApartmentUrls?.toLocaleString('ru-RU') ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Public listings</dt>
                  <dd className="font-medium tabular-nums">{d.seo.catalogPublicListings.toLocaleString('ru-RU')}</dd>
                </div>
              </dl>
              {d.seo.sitemapGeneratedAt ? (
                <p className="text-[10px] text-muted-foreground">
                  Generated {new Date(d.seo.sitemapGeneratedAt).toLocaleString('ru-RU')}
                  {d.seo.sitemapApartmentUrls != null && d.seo.catalogPublicListings > 0
                    ? ` · coverage ${Math.round((d.seo.sitemapApartmentUrls / d.seo.catalogPublicListings) * 100)}%`
                    : ''}
                </p>
              ) : (
                <p className="text-xs text-amber-700">Sitemap not generated — run regen in Feed Import</p>
              )}
              <Link to="/admin/feed-import" className="text-xs text-primary hover:underline inline-block">
                Feed Import / sitemap →
              </Link>
              {d.seo.landingCoverage ? (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-border mt-2">
                  <div>
                    <dt className="text-muted-foreground">District landings</dt>
                    <dd className="font-medium tabular-nums">{d.seo.landingCoverage.coveredDistricts}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Metro landings</dt>
                    <dd className="font-medium tabular-nums">{d.seo.landingCoverage.coveredSubways}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Thin districts</dt>
                    <dd className={cn('font-medium tabular-nums', d.seo.landingCoverage.thinDistricts > 0 && 'text-amber-700')}>
                      {d.seo.landingCoverage.thinDistricts}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Orphan districts</dt>
                    <dd className="font-medium tabular-nums">{d.seo.landingCoverage.orphanDistricts}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Indexable patterns</dt>
                    <dd className="font-medium tabular-nums">{d.seo.landingCoverage.indexableLandingPatterns}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Crawl depth hint</dt>
                    <dd className="font-medium tabular-nums">{d.seo.landingCoverage.crawlDepthHint}</dd>
                  </div>
                </dl>
              ) : null}
            </section>
          ) : null}

          {d.sitemap ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-2">
              <h2 className="font-semibold text-sm">SEO sitemap</h2>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Total URLs</dt><dd className="font-medium tabular-nums">{d.sitemap.totalUrls?.toLocaleString('ru-RU') ?? '—'}</dd></div>
                <div><dt className="text-muted-foreground">Last run</dt><dd className="font-medium">{d.sitemap.lastGeneration ? `${d.sitemap.lastGeneration.durationMs}ms` : '—'}</dd></div>
              </dl>
              <p className="text-[10px] text-muted-foreground break-all">{d.sitemap.indexUrl}</p>
              <Link to="/admin/feed-import" className="text-xs text-primary hover:underline inline-block">
                Regenerate in Feed Import →
              </Link>
            </section>
          ) : null}

          {d.feed ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                Feed health
                <AdminStatusBadge tone={d.feed.ok ? 'ok' : 'warn'}>
                  {d.feed.ok ? 'ok' : 'attention'}
                </AdminStatusBadge>
              </h2>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Regions</dt><dd className="font-medium">{d.feed.regions.enabled}</dd></div>
                <div><dt className="text-muted-foreground">Stale</dt><dd className="font-medium">{d.feed.regions.stale.length}</dd></div>
                <div><dt className="text-muted-foreground">Running</dt><dd className="font-medium">{d.feed.batches.running}</dd></div>
                <div><dt className="text-muted-foreground">Orphans</dt><dd className="font-medium">{d.feed.dataIntegrity.orphanApartments}</dd></div>
              </dl>
              {d.feed.issues.slice(0, 4).map((issue) => (
                <p key={issue.kind} className="text-xs text-muted-foreground">{issue.messageRu}</p>
              ))}
              <Link to="/admin/feed-import" className="text-xs text-primary hover:underline inline-block">
                Feed Import →
              </Link>
            </section>
          ) : null}

          {d.runtime ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <h2 className="font-semibold text-sm mb-2">Runtime</h2>
              <p className="text-xs text-muted-foreground">
                RSS {d.runtime.memoryMb.rss} MB · heap {d.runtime.memoryMb.heapUsed}/{d.runtime.memoryMb.heapTotal} MB · {d.runtime.nodeEnv}
              </p>
            </section>
          ) : null}

          {d.trust ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4" /> Trust
              </h2>
              <p className="text-xs text-muted-foreground">
                Flagged: {d.trust.flaggedListings ?? '—'} · avg quality: {d.trust.avgQualityScore ?? '—'}
              </p>
              <Link to="/admin/trust" className="text-xs text-primary hover:underline mt-1 inline-block">
                Trust Center →
              </Link>
            </section>
          ) : null}

          {d.billing ? (
            <section className="rounded-xl border bg-card p-4 mb-4">
              <h2 className="font-semibold text-sm mb-2">Billing</h2>
              <p className="text-xs text-muted-foreground">
                Subs: {d.billing.activeSubscriptions ?? 0} · overdue: {d.billing.overdueInvoices ?? 0} · rev 30d:{' '}
                {((d.billing.promotionRevenue30dRub ?? 0) / 1000).toFixed(0)}k ₽ · pressure:{' '}
                {d.billing.quotaPressureHint ?? '—'}
              </p>
              <Link to="/admin/billing" className="text-xs text-primary hover:underline mt-1 inline-block">
                Billing Center →
              </Link>
            </section>
          ) : null}

          {d.platform ? (
            <section className="rounded-xl border bg-card p-4 mb-4 space-y-2">
              <h2 className="font-semibold text-sm">Platform / Schema</h2>
              <p className={`text-xs font-medium ${d.platform.ok ? 'text-green-600' : 'text-destructive'}`}>
                {d.platform.ok ? 'Схема совместима' : 'Обнаружен drift схемы'}
              </p>
              {d.platform.pendingMigrations.length ? (
                <ul className="text-xs text-muted-foreground list-disc pl-4">
                  {d.platform.pendingMigrations.slice(0, 8).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}
              {d.platform.bootWarningsRu.map((w) => (
                <p key={w} className="text-xs text-amber-700 dark:text-amber-400">
                  {w}
                </p>
              ))}
            </section>
          ) : null}

          {clientDiag ? (
            <section className="rounded-xl border border-dashed bg-muted/30 p-4 mb-4 space-y-2">
              <h2 className="font-semibold text-sm">Dev workspace (client)</h2>
              <p className="text-xs text-muted-foreground">
                Lazy routes in registry: {clientDiag.lazyRoutesRegistered} · import failures:{' '}
                {clientDiag.lazyImportFailures.length}
              </p>
              {clientDiag.lazyImportFailures.length ? (
                <ul className="text-xs text-destructive list-disc pl-4">
                  {clientDiag.lazyImportFailures.map((f) => (
                    <li key={`${f.routeId}-${f.at}`}>
                      {f.routeId}: {f.message.slice(0, 80)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul className="text-[10px] text-muted-foreground list-disc pl-4">
                {clientDiag.workspaceHints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-[10px] text-muted-foreground">
            Updated {new Date(d.refreshedAt).toLocaleString('ru-RU')}
          </p>
        </>
      ) : null}
    </div>
  );
}
