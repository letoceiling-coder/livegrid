export type SearchStep = 'idle' | 'search_city' | 'search_type' | 'search_budget' | 'search_results';

export type UserSession = {
  city?: 'moscow' | 'belgorod' | 'all';
  type?: 'apartments' | 'houses' | 'land' | 'commercial';
  priceMax?: number;
  page?: number;
  step?: SearchStep;
  jwt?: string;
  catalogPage?: number;
  initialized?: boolean;
};

export type ComplexCard = {
  id: string | number;
  slug: string;
  name: string;
  district?: { name?: string } | null;
  subway?: { name?: string } | null;
  subwayDistance?: string | null;
  priceFrom?: number;
  status?: string;
  deadline?: string | null;
  images?: string[] | null;
  roomsBreakdown?: Array<{ rooms: number; count: number }>;
};

export type SearchResponse = {
  data: ComplexCard[];
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
    lastPage?: number;
  };
};

export type ContactsResponse = {
  phone: string;
  email: string;
  address: string;
  workHours: string;
  siteUrl: string;
  contactsUrl: string;
};
