import type { ResidentialComplex } from '@/redesign/data/types';
import type { ViewportBlockMarker } from '@/redesign/lib/viewport-map-types';

export function viewportMarkersToResidentialComplexes(
  markers: ViewportBlockMarker[],
): ResidentialComplex[] {
  return markers.map((m) => ({
    id: String(m.id),
    slug: m.slug,
    name: m.name,
    district: m.district ?? '',
    subway: '',
    subwayDistance: '',
    address: m.district ?? '',
    coords: [m.lat, m.lng] as [number, number],
    priceFrom: m.priceFrom ?? 0,
    priceTo: m.priceFrom ?? 0,
    images: m.imageUrl ? [m.imageUrl] : [],
    listingCount: undefined,
    buildings: [],
    description: '',
    builder: '',
    deadline: '',
    status: 'building' as const,
    advantages: [],
    infrastructure: [],
  }));
}
