import { useQuery } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';

export interface FilterOption {
  id: number;
  name: string;
}

export interface SubwayOption {
  id: number;
  name: string;
  line: string | null;
}

export interface FinishingOption {
  value: string;
  label: string;
}

export interface FiltersData {
  districts: FilterOption[];
  subways: SubwayOption[];
  builders: FilterOption[];
  finishings: FinishingOption[];
  buildingTypes: FilterOption[];
  queues: string[];
  wcOptions: number[];
  ceilingHeight: {
    min: number | null;
    max: number | null;
  };
}

async function fetchFilters(): Promise<FiltersData> {
  const url = getApiUrl('filters');
  const res = await fetch(url, defaultFetchOptions);
  if (!res.ok) throw new Error('Failed to load filters');
  return res.json();
}

export function useFilters() {
  return useQuery<FiltersData>({
    queryKey: ['catalog-filters'],
    queryFn: fetchFilters,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });
}
