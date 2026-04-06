import type { ResidentialComplex } from '@/redesign/data/types';

export function mapApartmentToComplexCard(item: any) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    image: item.image,
    priceFrom: item.price,
    priceTo: null,
    address: item.address,
    metro: item.metro,
    badges: item.badges,
  };
}

/** Bridge mapApartmentToComplexCard output to ComplexCard's ResidentialComplex model */
export function apartmentCardToResidential(m: ReturnType<typeof mapApartmentToComplexCard>): ResidentialComplex {
  const priceFrom = m.priceFrom ?? 0;
  const priceTo = m.priceTo ?? priceFrom;
  return {
    id: String(m.id),
    slug: m.slug ?? '',
    name: m.title ?? 'Квартира',
    description: '',
    builder: '',
    district: '',
    subway: m.metro ?? '',
    subwayDistance: '',
    address: m.address ?? '',
    deadline: '',
    status: 'building',
    priceFrom,
    priceTo,
    availableApartments: 1,
    images: [m.image || '/placeholder-complex.svg'],
    coords: [0, 0],
    advantages: Array.isArray(m.badges) ? m.badges : [],
    infrastructure: [],
    buildings: [],
  };
}
