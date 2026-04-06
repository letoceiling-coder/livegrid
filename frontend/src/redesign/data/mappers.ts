/**
 * mappers.ts — API response → unified Complex model
 *
 * Rule: raw API shapes are NEVER passed beyond these functions.
 * Every hook calls one of these mappers; UI only ever sees Complex.
 */

import type { Complex, RoomBreakdown } from './types';

// ─── Raw shapes from GET /api/v1/search/complexes ─────────────────────────
// Nested objects, camelCase, coords as { lat, lng } object.

export interface ApiSearchComplex {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  district: { id: string; name: string } | null;
  subway: { id: string; name: string; line: string } | null;
  subwayDistance?: string | null;
  builder: { id: string; name: string } | null;
  address?: string | null;
  coords: { lat: number; lng: number } | null;
  status: 'building' | 'completed' | 'planned';
  deadline?: string | null;
  priceFrom: number;
  priceTo?: number;
  images?: string[] | null;
  advantages?: string[] | null;
  infrastructure?: string[] | null;
  totalAvailableApartments?: number;
  roomsBreakdown?: { rooms: number; count: number; minPrice: number; minArea: number }[] | null;
}

export interface ApiSearchResponse {
  data: ApiSearchComplex[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
}

// ─── Raw shapes from GET /api/v1/map/complexes ────────────────────────────
// Flat strings, coords as [lat, lng] tuple, no nested objects.

export interface ApiMapComplex {
  id: string;
  slug: string;
  name: string;
  coords: [number, number];
  images?: string[] | null;
  priceFrom?: number;
  district?: string;
  subway?: string;
  builder?: string;
  available?: number;
}

export interface ApiMapResponse {
  data: ApiMapComplex[];
}

// ─── Mapper: search endpoint → Complex ────────────────────────────────────

export function mapSearchComplexToModel(api: ApiSearchComplex): Complex {
  const images = api.images ?? [];
  return {
    id: api.id,
    slug: api.slug,
    name: api.name,

    lat: api.coords?.lat ?? 0,
    lng: api.coords?.lng ?? 0,

    price_from: api.priceFrom,
    price_to: api.priceTo,

    district: api.district?.name ?? undefined,
    subway: api.subway?.name ?? undefined,
    subway_distance: api.subwayDistance ?? undefined,
    address: api.address ?? undefined,

    builder: api.builder?.name ?? undefined,
    status: api.status,
    deadline: api.deadline ?? undefined,
    description: api.description ?? undefined,

    image: images[0],
    images,

    advantages: api.advantages ?? [],
    infrastructure: api.infrastructure ?? [],
    total_available_apartments: api.totalAvailableApartments ?? 0,
    buildings: [],
    roomsBreakdown: (api.roomsBreakdown ?? []).map((r): RoomBreakdown => ({
      rooms: r.rooms,
      count: r.count,
      minArea: r.minArea,
      minPrice: r.minPrice,
    })),
  };
}

// ─── Mapper: map endpoint → Complex ───────────────────────────────────────

export function mapMapComplexToModel(api: ApiMapComplex): Complex {
  const images = api.images ?? [];
  return {
    id: api.id,
    slug: api.slug,
    name: api.name,

    // Map endpoint returns coords as [lat, lng] tuple
    lat: api.coords[0],
    lng: api.coords[1],

    price_from: api.priceFrom,

    district: api.district,
    subway: api.subway,
    builder: api.builder,

    image: images[0],
    images,

    total_available_apartments: api.available ?? 0,

    // Fields not provided by map endpoint default to undefined
    buildings: [],
  };
}
