import { describe, it, expect } from 'vitest';
import { viewportMarkersToListingMapItems } from './viewport-listings-source';

describe('viewportMarkersToListingMapItems', () => {
  it('maps viewport DTO fields to ListingMapItem shape', () => {
    const items = viewportMarkersToListingMapItems([
      {
        id: 42,
        lat: 55.75,
        lng: 37.62,
        price: '5000000',
        title: 'Test flat',
        photoUrl: 'https://example.com/p.jpg',
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 42,
      lat: 55.75,
      lng: 37.62,
      price: '5000000',
      title: 'Test flat',
      photoUrl: 'https://example.com/p.jpg',
      kind: '',
      address: null,
    });
  });
});
