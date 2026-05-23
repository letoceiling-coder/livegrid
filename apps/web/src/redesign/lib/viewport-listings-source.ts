import type { ListingMapItem } from '@/redesign/components/ListingsMapSearch';
import type { ViewportListingMarker } from '@/redesign/lib/viewport-map-types';

/** Convert viewport API markers to listing map items for cluster layer descriptors */
export function viewportMarkersToListingMapItems(
  markers: ViewportListingMarker[],
): ListingMapItem[] {
  return markers.map((m) => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    price: m.price,
    title: m.title,
    kind: '',
    address: null,
    photoUrl: m.photoUrl ?? null,
  }));
}
