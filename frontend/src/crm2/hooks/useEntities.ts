import { useQuery } from '@tanstack/react-query';
import { v2 } from '../api/v2Client';
import { entityListSearchParams } from '../lib/queryParams';
import type { EntityListResponse } from '../types/schema';

export interface EntityListQuery {
  cursor?: string;
  per_page?: number;
  sort?: string;
  sort_dir?: 'asc' | 'desc';
  search?: string;
  deleted?: 'active' | 'only' | 'with';
  /** Flat filter params (field_min, field_max, field[], field=true…) */
  filters?: Record<string, string | string[] | number | boolean | undefined | null>;
}

export function useEntitiesList(type: string | undefined, q: EntityListQuery) {
  const params: Record<string, string | string[] | number | boolean | undefined | null> = {
    cursor: q.cursor ?? '',
    per_page: q.per_page ?? 20,
    sort: q.sort,
    sort_dir: q.sort_dir,
    search: q.search,
    deleted: q.deleted,
    ...q.filters,
  };

  const qs = entityListSearchParams(params);
  const key = ['v2', 'entities', type, qs] as const;

  return useQuery({
    queryKey: key,
    queryFn: () => v2.get<EntityListResponse>(`/entities/${type}?${qs}`),
    enabled: !!type,
    placeholderData: prev => prev,
  });
}

/** Async search for relation picker (cursor pagination, first page only). */
export async function searchEntitiesForRelation(
  targetType: string,
  search: string,
  labelField: string | null | undefined,
  signal?: AbortSignal,
): Promise<{ id: number; label: string }[]> {
  const qs = entityListSearchParams({
    cursor: '',
    per_page: 15,
    search: search.trim() || undefined,
  });
  const res = await v2.get<EntityListResponse>(`/entities/${targetType}?${qs}`, { signal });
  const rows = res.data ?? [];
  const lf = (labelField || 'name').trim() || 'name';
  return rows.map(r => {
    const vals = r.values ?? {};
    const fromCode = vals[lf];
    const label =
      fromCode != null && fromCode !== ''
        ? String(fromCode)
        : vals.name != null
          ? String(vals.name)
          : vals.title != null
            ? String(vals.title)
            : `#${r.id}`;
    return { id: r.id, label };
  });
}
