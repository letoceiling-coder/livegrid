import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

const REGION_STORAGE_KEY = 'livegrid_region_id';
const FALLBACK_REGION_ID = 1;

export function useDefaultRegionId() {
  const query = useQuery({
    queryKey: ['default-region-id'],
    queryFn: async () => {
      const stored = Number(localStorage.getItem(REGION_STORAGE_KEY));
      if (Number.isFinite(stored) && stored > 0) return stored;
      return FALLBACK_REGION_ID;
    },
    staleTime: Infinity,
  });

  const setStoredRegionId = useCallback((id: number) => {
    if (Number.isFinite(id) && id > 0) {
      localStorage.setItem(REGION_STORAGE_KEY, String(id));
    }
  }, []);

  return {
    data: query.data ?? FALLBACK_REGION_ID,
    setStoredRegionId,
    isLoading: query.isLoading,
  };
}
