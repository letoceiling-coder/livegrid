import { useEffect, useState } from 'react';

export function useSuggest(query: string) {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    const t = setTimeout(() => {
      fetch(`/api/v1/search/suggest?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(res => res.json())
        .then(setResults)
        .catch(() => {});
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  return results;
}
