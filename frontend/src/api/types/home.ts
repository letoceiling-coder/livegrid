export interface HomeBlockCard {
  id: string;
  type: 'complex' | 'apartment';
  title: string | null;
  slug: string | null;
  image: string;
  price: number | null;
  priceFrom: number | null;
  priceTo: number | null;
  address: string | null;
  metro: string | null;
  badges: string[];
}

export interface HomeBlocksResponse {
  popular: HomeBlockCard[];
  hot: HomeBlockCard[];
  start: HomeBlockCard[];
  stats?: { complexes: number; apartments: number };
  meta?: { generated_at: string; version: string };
}
