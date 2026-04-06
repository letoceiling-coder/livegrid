import type { LayoutGroup, ResidentialComplex } from '@/redesign/data/types';

export function buildLayoutGroupsFromComplex(complex: ResidentialComplex | null | undefined): LayoutGroup[] {
  if (!complex) return [];
  const buildings = Array.isArray(complex.buildings) ? complex.buildings : [];
  const groups: Record<number, {
    rooms: number; roomName: string; minArea: number; minPrice: number;
    planImage: string; count: number; apartmentId: string;
  }> = {};

  buildings
    .flatMap(b => Array.isArray(b.apartments) ? b.apartments : [])
    .filter((a: { status: string }) => a.status === 'available')
    .forEach((a: {
      id: string; roomCategory: number | null; rooms: number; roomName: string;
      area: number; price: number; planImage: string;
    }) => {
      const cat = a.roomCategory ?? a.rooms;
      if (!groups[cat]) {
        groups[cat] = {
          rooms: cat,
          roomName: a.roomName,
          minArea: a.area,
          minPrice: a.price,
          planImage: a.planImage,
          count: 0,
          apartmentId: a.id,
        };
      }
      groups[cat].count++;
      if (a.area < groups[cat].minArea) groups[cat].minArea = a.area;
      if (a.price < groups[cat].minPrice) {
        groups[cat].minPrice = a.price;
        groups[cat].planImage = a.planImage;
        groups[cat].apartmentId = a.id;
      }
    });

  return Object.values(groups).map((g, i) => ({
    id: String(i),
    complexId: complex.id,
    apartmentId: g.apartmentId,
    rooms: g.rooms,
    area: g.minArea,
    priceFrom: g.minPrice,
    planImage: g.planImage,
    availableCount: g.count,
  }));
}
