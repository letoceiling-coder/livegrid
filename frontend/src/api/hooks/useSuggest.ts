import { useEffect, useState } from 'react';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import {
  emptySuggestGrouped,
  parseSuggestResponse,
  type SuggestGroupedResponse,
  suggestTotalCount,
} from '@/api/suggestTypes';

export type { SuggestGroupedResponse };

/**
 * Подсказки для строки поиска: группы ЖК / метро / районы / улицы / застройщики.
 */
export function useSuggest(query: string): SuggestGroupedResponse {
  const [data, setData] = useState<SuggestGroupedResponse>(emptySuggestGrouped);

  useEffect(() => {
    if (!query || query.length < 2) {
      setData(emptySuggestGrouped());
      return;
    }

    const controller = new AbortController();

    const t = window.setTimeout(() => {
      const url = `${getApiUrl('search/suggest')}?${new URLSearchParams({ q: query.trim() }).toString()}`;
      fetch(url, { ...defaultFetchOptions, signal: controller.signal })
        .then(res => (res.ok ? res.json() : null))
        .then(json => {
          if (json == null) return;
          setData(parseSuggestResponse(json));
        })
        .catch(() => {});
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  return data;
}

export { suggestTotalCount };
