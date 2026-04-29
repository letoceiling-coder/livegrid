import type { ResidentialComplex } from '@/redesign/data/types';

export interface ApiBlockListRow {
  id: string;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  builder?: string | null;
  builder_name?: string | null;
  district?: string | null;
  district_name?: string | null;
  subway?: string | null;
  subway_name?: string | null;
  subway_distance?: string | null;
  address?: string | null;
  deadline?: string | null;
  status?: 'building' | 'completed' | 'planned' | string | null;
  price_from?: number | string | null;
  price_to?: number | string | null;
  available_apartments?: number | null;
  total_available_apartments?: number | null;
  image?: string | null;
  images?: string[] | null;
  lat?: number | string | null;
  lng?: number | string | null;
  advantages?: string[] | null;
  infrastructure?: string[] | null;
  buildings?: any[] | null;
}

export function mapApiBlockListRowToResidentialComplex(row: ApiBlockListRow): ResidentialComplex {
  const images = Array.isArray(row.images) && row.images.length > 0
    ? row.images
    : [row.image || '/placeholder-complex.svg'];

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name ?? 'ЖК',
    description: row.description ?? '',
    builder: row.builder ?? row.builder_name ?? '',
    district: row.district ?? row.district_name ?? '',
    subway: row.subway ?? row.subway_name ?? '',
    subwayDistance: row.subway_distance ?? '',
    address: row.address ?? '',
    deadline: row.deadline ?? '',
    status: normalizeStatus(row.status),
    priceFrom: Number(row.price_from ?? 0),
    priceTo: Number(row.price_to ?? row.price_from ?? 0),
    availableApartments: Number(row.available_apartments ?? row.total_available_apartments ?? 0),
    images,
    coords: [Number(row.lat ?? 0), Number(row.lng ?? 0)],
    advantages: row.advantages ?? [],
    infrastructure: row.infrastructure ?? [],
    buildings: row.buildings ?? [],
  };
}

function normalizeStatus(status: ApiBlockListRow['status']): ResidentialComplex['status'] {
  if (status === 'completed' || status === 'planned' || status === 'building') return status;
  return 'building';
}
