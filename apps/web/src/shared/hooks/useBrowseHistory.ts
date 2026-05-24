import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { optionalAuthQueryOptions } from '@/shared/lib/safe-query';
import { apiGet } from '@/lib/api';
import {
  readLocalBrowseHistory,
  type LocalBrowseRow,
} from '@/shared/lib/browse-history-local';

type ServerHistoryRow = {
  id: string;
  entityKind: string;
  entityId: number;
  title: string | null;
  viewedAt: string;
};

export type BrowseHistoryItem = {
  id: string;
  entityKind: 'LISTING' | 'BLOCK';
  entityId: number;
  title: string;
  href: string;
  viewedAt: string;
  source: 'local' | 'server';
};

function serverToItem(row: ServerHistoryRow): BrowseHistoryItem {
  const kind = row.entityKind === 'BLOCK' ? 'BLOCK' : 'LISTING';
  return {
    id: row.id,
    entityKind: kind,
    entityId: row.entityId,
    title: row.title?.trim() || `#${row.entityId}`,
    href: kind === 'BLOCK' ? `/complex/${row.entityId}` : `/listing/${row.entityId}`,
    viewedAt: row.viewedAt,
    source: 'server',
  };
}

function localToItem(row: LocalBrowseRow): BrowseHistoryItem {
  return {
    id: `local:${row.entityKind}:${row.entityId}`,
    entityKind: row.entityKind,
    entityId: row.entityId,
    title: row.title?.trim() || `#${row.entityId}`,
    href: row.href,
    viewedAt: row.viewedAt,
    source: 'local',
  };
}

function mergeHistory(server: BrowseHistoryItem[], local: BrowseHistoryItem[]): BrowseHistoryItem[] {
  const seen = new Set<string>();
  const out: BrowseHistoryItem[] = [];
  const all = [...server, ...local].sort(
    (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
  );
  for (const row of all) {
    const k = `${row.entityKind}:${row.entityId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
    if (out.length >= 12) break;
  }
  return out;
}

export function useBrowseHistory(limit = 8) {
  const { isAuthenticated } = useAuth();

  const serverQuery = useQuery({
    queryKey: ['account', 'history', 'recent'],
    queryFn: () => apiGet<ServerHistoryRow[]>('/account/history'),
    ...optionalAuthQueryOptions({ isAuthenticated }),
    staleTime: 30_000,
  });

  const localRows = readLocalBrowseHistory();
  const serverItems = (serverQuery.data ?? []).map(serverToItem);
  const localItems = localRows.map(localToItem);
  const items = mergeHistory(serverItems, localItems).slice(0, limit);

  const recentListingIds = items
    .filter((r) => r.entityKind === 'LISTING')
    .map((r) => r.entityId)
    .slice(0, 6);

  return {
    items,
    recentListingIds,
    isLoading: isAuthenticated && serverQuery.isLoading,
    hasHistory: items.length > 0,
  };
}
