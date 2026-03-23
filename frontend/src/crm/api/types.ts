export interface CrmUser {
  id: number;
  name: string;
  email: string;
}

export interface CrmLoginResponse {
  token: string;
  user: CrmUser;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface CrmComplex {
  id: string;
  name: string;
  slug: string;
  builder_id: number | null;
  builder: string | null;
  district_id: number | null;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: string | null;
  deadline: string | null;
  images: string[];
  description?: string;
  advantages?: string[];
  infrastructure?: string[];
  apartments_count?: number;
}

export interface CrmApartment {
  id: string;
  block_id: string;
  complex: string | null;
  building_id: string | null;
  number: string | null;
  floor: number;
  floors: number | null;
  rooms_count: number;
  area_total: number;
  area_kitchen: number | null;
  price: number;
  status: string;
  is_active: boolean;
  plan_image: string | null;
  section: number | null;
  finishing_id: number | null;
  finishing: string | null;
}

export interface CrmBuilder {
  id: number;
  name: string;
}

export interface CrmDistrict {
  id: number;
  name: string;
}

export interface DashboardStats {
  stats: {
    complexes: number;
    apartments: number;
    builders: number;
    districts: number;
  };
  apartments_by_status: {
    available: number;
    reserved: number;
    sold: number;
  };
  recent_complexes: Array<{
    id: string;
    name: string;
    slug: string;
    builder: string | null;
    status: string | null;
  }>;
}

export interface FeedStatus {
  running: boolean;
  status: {
    last_run: string | null;
    result: 'success' | 'error' | null;
    output?: string;
    complexes: number;
    apartments: number;
  };
}
