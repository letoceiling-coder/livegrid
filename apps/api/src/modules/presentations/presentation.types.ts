import type { ListingKind } from '@prisma/client';

export type PresentationPayload = {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string | null;
  metro: string | null;
  builder: string | null;
  deadline: string | null;
  availableApartments: number;
  priceFrom: number | null;
  priceTo: number | null;
  roomMix: Array<{ label: string; count: number; priceFrom: number | null }>;
  generatedAt: string;
};

export type ListingPresentationPayload = {
  listingId: number;
  kind: ListingKind;
  kindLabel: string;
  title: string;
  description: string | null;
  price: number | null;
  address: string | null;
  region: string | null;
  district: string | null;
  builder: string | null;
  blockName: string | null;
  /** Для кнопки «ЖК»: ссылка на /complex/[slug]. */
  blockSlug: string | null;
  subtitle: string | null;
  photoUrls: string[];
  planUrls: string[];
  latitude: number | null;
  longitude: number | null;
  generatedAt: string;
};
