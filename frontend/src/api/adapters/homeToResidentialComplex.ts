import type { HomeBlockCard } from '@/api/types/home';
import type { ResidentialComplex } from '@/redesign/data/types';

/** Maps a home BFF complex card to the shape expected by ComplexCard (catalog-style, empty buildings). */
export function homeComplexCardToResidential(card: HomeBlockCard): ResidentialComplex {
  const priceFrom = card.priceFrom ?? card.priceTo ?? card.price ?? 0;
  const priceTo = card.priceTo ?? card.priceFrom ?? card.price ?? 0;
  return {
    id: card.id,
    slug: card.slug ?? '',
    name: card.title ?? 'ЖК',
    description: '',
    builder: '',
    district: '',
    subway: card.metro ?? '',
    subwayDistance: '',
    address: card.address ?? '',
    deadline: '',
    status: 'building',
    priceFrom,
    priceTo,
    availableApartments: 0,
    images: [card.image || '/placeholder-complex.svg'],
    coords: [0, 0],
    advantages: [],
    infrastructure: [],
    buildings: [],
  };
}
