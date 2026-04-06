import { useInfiniteQuery } from '@tanstack/react-query';
import { v2 } from '../api/v2Client';
import { entityListSearchParams } from '../lib/queryParams';
import type { EntityHistoryCursorMeta, EntityHistoryItemDto } from '../types/schema';

export interface EntityHistoryQuery {
  per_page?: number;
  action?: string;
  user_id?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  search?: string;
}

export function useEntityHistory(type: string | undefined, id: string | undefined, q: EntityHistoryQuery) {
  return useInfiniteQuery({
    queryKey: ['v2', 'entity-history', type, id, q] as const,
    enabled: !!type && !!id && id !== 'create',
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) => {
      const qs = entityListSearchParams({
        cursor: String(pageParam ?? ''),
        per_page: q.per_page ?? 50,
        action: q.action,
        user_id: q.user_id,
        from: q.from,
        to: q.to,
        search: q.search,
      } as Record<string, string | number | boolean | string[] | undefined | null>);
      // cursor mode is enabled by presence of `cursor` key (may be empty)
      return v2.get<{ data: EntityHistoryItemDto[]; meta: EntityHistoryCursorMeta }>(
        `/entities/${type}/${id}/history?${qs}`,
      );
    },
    getNextPageParam: last => last.meta?.next_cursor ?? undefined,
  });
}

