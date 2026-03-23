import { useQuery } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';

export interface ApartmentDetail {
  apartment: {
    id: string;
    complexId: string;
    buildingId: string | null;
    rooms: number;
    area: number;
    kitchenArea: number | null;
    floor: number;
    totalFloors: number | null;
    price: number;
    pricePerMeter: number;
    finishing: string | null;
    status: string;
    planImage: string | null;
    section: number | null;
  };
  complex: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    district: string | null;
    subway: string | null;
    subwayDistance: string | null;
    builder: string | null;
  } | null;
  building: {
    id: string;
    name: string;
    deadline: string | null;
  } | null;
}

async function fetchApartment(id: string): Promise<ApartmentDetail> {
  const res = await fetch(getApiUrl(`apartments/${id}`), defaultFetchOptions);
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data as ApartmentDetail;
}

export function useApartment(id: string | undefined) {
  return useQuery<ApartmentDetail>({
    queryKey: ['apartment', id],
    queryFn: () => fetchApartment(id!),
    enabled: !!id,
    staleTime: 60_000,
    retry: (count, err: any) => err?.message !== 'not_found' && count < 2,
  });
}
