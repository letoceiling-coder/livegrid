// ─── Unified internal model (returned by useBlocks / useMapObjects) ──────────
export interface Complex {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  price_from?: number;
  price_to?: number;
  district?: string;
  subway?: string;
  subway_distance?: string;
  address?: string;
  builder?: string;
  status?: 'building' | 'completed' | 'planned';
  deadline?: string;
  description?: string;
  image?: string;
  images: string[];
  advantages: string[];
  infrastructure: string[];
  total_available_apartments: number;
  buildings: any[];
  roomsBreakdown?: RoomBreakdown[];
}

export interface Viewport {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
  zoom?: number;
  interactionId?: number;
}

export interface ResidentialComplex {
  id: string;
  slug: string;
  name: string;
  description: string;
  builder: string;
  district: string;
  subway: string;
  subwayDistance: string;
  address: string;
  deadline: string;
  status: 'building' | 'completed' | 'planned';
  priceFrom: number;
  priceTo: number;
  /** Pre-aggregated count from complexes_search — always correct in catalog view */
  availableApartments: number;
  images: string[];
  coords: [number, number];
  advantages: string[];
  infrastructure: string[];
  buildings: Building[];
}

export interface Building {
  id: string;
  complexId: string;
  name: string;
  floors: number;
  sections: number;
  deadline: string;
  apartments: Apartment[];
}

export interface Apartment {
  id: string;
  complexId: string;
  buildingId: string;
  rooms: number;
  roomCategory: number | null;
  roomName: string;
  area: number;
  kitchenArea: number;
  floor: number;
  totalFloors: number;
  price: number;
  pricePerMeter: number;
  finishing: 'без отделки' | 'черновая' | 'чистовая' | 'под ключ';
  status: 'available' | 'reserved' | 'sold';
  planImage: string;
  section: number;
}

export interface LayoutGroup {
  id: string;
  complexId: string;
  /** ID of the cheapest available apartment in this room-type group */
  apartmentId: string;
  rooms: number;
  area: number;
  priceFrom: number;
  planImage: string;
  availableCount: number;
}

export interface RoomBreakdown {
  rooms: number;
  count: number;
  minArea: number;
  minPrice: number;
}

export type SortField = 'price' | 'area' | 'floor' | 'rooms';
export type SortDir = 'asc' | 'desc';

export interface CatalogFilters {
  priceMin?: number;
  priceMax?: number;
  rooms: number[];
  wc: number[];
  areaMin?: number;
  areaMax?: number;
  livingAreaMin?: number;
  livingAreaMax?: number;
  ceilingHeightMin?: number;
  ceilingHeightMax?: number;
  district: string[];
  subway: string[];
  subwayTimeMax?: number;
  subwayDistanceType: number[];
  buildingType: string[];
  queue: string[];
  builder: string[];
  finishing: string[];
  deadline: string[];
  floorMin?: number;
  floorMax?: number;
  notFirstFloor: boolean;
  notLastFloor: boolean;
  highFloor: boolean;
  hasPlan: boolean;
  status: string[];
  sort: 'price_asc' | 'price_desc' | 'price_per_m2_asc' | 'price_per_m2_desc' | 'area_desc' | 'deadline_asc';
  search: string;
}

export const defaultFilters: CatalogFilters = {
  rooms: [],
  wc: [],
  subwayDistanceType: [],
  buildingType: [],
  queue: [],
  district: [],
  subway: [],
  builder: [],
  finishing: [],
  deadline: [],
  notFirstFloor: false,
  notLastFloor: false,
  highFloor: false,
  hasPlan: false,
  status: [],
  sort: 'price_asc',
  search: '',
};
