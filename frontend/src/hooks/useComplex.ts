import { useQuery } from '@tanstack/react-query';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import type { ResidentialComplex, Building, Apartment } from '@/redesign/data/types';

// API shapes from ComplexResource + BuildingResource + ApartmentResource
interface ApiApartment {
  id: string; complexId: string; buildingId: string;
  rooms: number; roomCategory: number | null; roomName: string | null;
  area: number; kitchenArea: number | null;
  floor: number; totalFloors: number | null;
  price: number; pricePerMeter: number;
  finishing: string | null; status: string; planImage: string | null; section: number | null;
}

interface ApiBuilding {
  id: string; name: string; floors: number; sections: number;
  deadline: string | null; apartments: ApiApartment[];
}

interface ApiComplex {
  id: string; slug: string; name: string; description: string | null;
  district: { id: string; name: string } | null;
  subway: { id: string; name: string; line: string } | null;
  subwayDistance: string | null;
  builder: { id: string; name: string } | null;
  address: string | null;
  coords: { lat: number; lng: number };
  status: string; deadline: string | null;
  priceFrom: number; priceTo: number;
  images: string[]; advantages: string[]; infrastructure: string[];
  buildings: ApiBuilding[];
  totalAvailableApartments: number;
}

function mapApartment(a: ApiApartment, complexId: string, buildingId: string): Apartment {
  // Fallback room name if API doesn't have it yet
  const roomName = a.roomName ?? (a.rooms === 0 ? 'Студия' : `${a.rooms}-комн.`);
  return {
    id: a.id,
    complexId,
    buildingId,
    rooms: a.rooms ?? 0,
    roomCategory: a.roomCategory ?? null,
    roomName,
    area: a.area ?? 0,
    kitchenArea: a.kitchenArea ?? 0,
    floor: a.floor ?? 1,
    totalFloors: a.totalFloors ?? 1,
    price: a.price ?? 0,
    pricePerMeter: a.pricePerMeter ?? 0,
    finishing: (a.finishing as Apartment['finishing']) ?? 'без отделки',
    status: (a.status as Apartment['status']) ?? 'available',
    planImage: a.planImage ?? '',
    section: a.section ?? 1,
  };
}

function mapBuilding(b: ApiBuilding, complexId: string): Building {
  return {
    id: b.id,
    complexId,
    name: b.name,
    floors: b.floors ?? 0,
    sections: b.sections ?? 1,
    deadline: b.deadline ?? '',
    apartments: (b.apartments ?? []).map(a => mapApartment(a, complexId, b.id)),
  };
}

export function mapApiComplex(api: ApiComplex): ResidentialComplex {
  return {
    id: api.id,
    slug: api.slug,
    name: api.name,
    description: api.description ?? '',
    builder: api.builder?.name ?? '',
    district: api.district?.name ?? '',
    subway: api.subway?.name ?? '',
    subwayDistance: api.subwayDistance ?? '',
    address: api.address ?? '',
    deadline: api.deadline ?? '',
    status: (api.status as ResidentialComplex['status']) ?? 'building',
    priceFrom: api.priceFrom ?? 0,
    priceTo: api.priceTo ?? 0,
    availableApartments: api.totalAvailableApartments ?? 0,
    images: api.images?.length ? api.images : ['/placeholder-complex.svg'],
    coords: [api.coords?.lat ?? 0, api.coords?.lng ?? 0],
    advantages: api.advantages ?? [],
    infrastructure: api.infrastructure ?? [],
    buildings: (api.buildings ?? []).map(b => mapBuilding(b, api.id)),
  };
}

async function fetchComplex(slug: string): Promise<ResidentialComplex> {
  const res = await fetch(getApiUrl(`complexes/${slug}`), defaultFetchOptions);
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return mapApiComplex(json.data as ApiComplex);
}

export function useComplex(slug: string | undefined) {
  return useQuery<ResidentialComplex>({
    queryKey: ['complex', slug],
    queryFn: () => fetchComplex(slug!),
    enabled: !!slug,
    staleTime: 60_000,
    retry: (count, err: any) => err?.message !== 'not_found' && count < 2,
  });
}
