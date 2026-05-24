import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Copy,
  Loader2,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LISTING_TRUST_FLAG_LABEL } from '@lg/shared';

type Summary = {
  flaggedListings: number;
  suspiciousAgents: number;
  duplicateClusters: number;
  avgQualityScore: number;
};

type FlagRow = {
  id: number;
  flagType: string;
  severity: string;
  createdAt: string;
  listing: {
    id: number;
    title: string | null;
    address: string | null;
    status: string;
    trustScore: { qualityScore: number } | null;
  };
  user: { id: string; fullName: string | null; email: string | null } | null;
};

type AgentRow = {
  userId: string;
  trustScore: number;
  rejectCount: number;
  duplicateCount: number;
  listingCount: number;
  user: { fullName: string | null; email: string | null; role: string };
};

type Cluster = {
  fingerprintHash: string;
  size: number;
  listings: Array<{ id: number; title: string | null; qualityScore: number }>;
};

type Tab = 'flagged' | 'agents' | 'duplicates';

export default function AdminTrustPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'flagged';
  const qc = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ['admin', 'trust', 'summary'],
    queryFn: () => apiGet<Summary>('/admin/trust/summary'),
    staleTime: 20_000,
  });

  const flaggedQuery = useQuery({
    queryKey: ['admin', 'trust', 'flagged'],
    queryFn: () => apiGet<{ data: FlagRow[] }>('/admin/trust/flagged-listings'),
    enabled: tab === 'flagged',
    staleTime: 20_000,
  });

  const agentsQuery = useQuery({
    queryKey: ['admin', 'trust', 'agents'],
    queryFn: () => apiGet<{ data: AgentRow[] }>('/admin/trust/suspicious-agents'),
    enabled: tab === 'agents',
    staleTime: 20_000,
  });

  const dupQuery = useQuery({
    queryKey: ['admin', 'trust', 'duplicates'],
    queryFn: () => apiGet<{ data: Cluster[] }>('/admin/trust/duplicate-clusters'),
    enabled: tab === 'duplicates',
    staleTime: 20_000,
  });

  const scanMut = useMutation({
    mutationFn: () => apiPost('/admin/trust/scan', {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'trust'] });
    },
  });

  const summary = summaryQuery.data;
  const tabs: Array<{ id: Tab; label: string; icon: typeof Shield }> = [
    { id: 'flagged', label: 'Флаги', icon: AlertTriangle },
    { id: 'agents', label: 'Агенты', icon: Users },
    { id: 'duplicates', label: 'Дубликаты', icon: Copy },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl pb-24">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Trust Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Качество объявлений, fraud-флаги и репутация
          </p>
        </div>
        <button
          type="button"
          disabled={scanMut.isPending}
          onClick={() => scanMut.mutate()}
          className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border text-sm shrink-0"
        >
          {scanMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="hidden sm:inline">Скан</span>
        </button>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl border p-3 bg-card">
            <p className="text-[10px] uppercase text-muted-foreground">Флаги</p>
            <p className="text-2xl font-bold">{summary.flaggedListings}</p>
          </div>
          <div className="rounded-xl border p-3 bg-card">
            <p className="text-[10px] uppercase text-muted-foreground">Подозр. агенты</p>
            <p className="text-2xl font-bold text-amber-700">{summary.suspiciousAgents}</p>
          </div>
          <div className="rounded-xl border p-3 bg-card">
            <p className="text-[10px] uppercase text-muted-foreground">Дубликаты</p>
            <p className="text-2xl font-bold">{summary.duplicateClusters}</p>
          </div>
          <div className="rounded-xl border p-3 bg-card">
            <p className="text-[10px] uppercase text-muted-foreground">Ср. качество</p>
            <p className="text-2xl font-bold">{summary.avgQualityScore}</p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams({ tab: t.id })}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium border min-h-[40px]',
              tab === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card',
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'flagged' ? (
        flaggedQuery.isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto my-12 text-muted-foreground" />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {(flaggedQuery.data?.data ?? []).map((row) => (
              <li key={row.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 min-h-[56px]">
                <div className="flex-1 min-w-0">
                  <Link to={`/admin/moderation/listings/${row.listing.id}`} className="text-sm font-medium hover:underline">
                    #{row.listing.id} {row.listing.title ?? row.listing.address ?? '—'}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {LISTING_TRUST_FLAG_LABEL[row.flagType as keyof typeof LISTING_TRUST_FLAG_LABEL] ?? row.flagType}
                    {' · '}
                    Q{row.listing.trustScore?.qualityScore ?? '—'}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border shrink-0',
                    row.severity === 'ALERT' && 'border-red-500/40 text-red-700 bg-red-500/5',
                    row.severity === 'WARN' && 'border-amber-500/40 text-amber-800 bg-amber-500/5',
                    row.severity === 'INFO' && 'border-border text-muted-foreground',
                  )}
                >
                  {row.severity}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'agents' ? (
        agentsQuery.isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto my-12 text-muted-foreground" />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {(agentsQuery.data?.data ?? []).map((row) => (
              <li key={row.userId} className="px-4 py-3 text-sm">
                <p className="font-medium">{row.user.fullName ?? row.user.email ?? row.userId}</p>
                <p className="text-xs text-muted-foreground">
                  trust {row.trustScore} · reject {row.rejectCount} · dup {row.duplicateCount} · listings {row.listingCount}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'duplicates' ? (
        dupQuery.isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto my-12 text-muted-foreground" />
        ) : (
          <ul className="space-y-3">
            {(dupQuery.data?.data ?? []).map((c) => (
              <li key={c.fingerprintHash} className="rounded-xl border bg-card p-3">
                <p className="text-xs font-mono text-muted-foreground mb-2 truncate">{c.fingerprintHash}</p>
                <p className="text-sm font-medium mb-2">{c.size} объявлений</p>
                <ul className="space-y-1">
                  {c.listings.map((l) => (
                    <li key={l.id}>
                      <Link to={`/admin/moderation/listings/${l.id}`} className="text-xs text-primary hover:underline">
                        #{l.id} Q{l.qualityScore} — {l.title ?? '—'}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
