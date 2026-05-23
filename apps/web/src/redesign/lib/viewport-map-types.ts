/** Slim marker DTO proposed for future viewport API — not used by legacy /blocks */
export type ViewportBlockMarker = {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  priceFrom: number | null;
  district: string | null;
  imageUrl: string | null;
};

export type ViewportListingMarker = {
  id: number;
  lat: number;
  lng: number;
  price: string | number | null;
  title: string | null;
  photoUrl: string | null;
};

export type ViewportFetchResult<T> = {
  data: T[];
  source: 'prototype-api' | 'client-filter' | 'legacy-fallback';
  fetchMs: number;
  payloadBytes: number | null;
  bboxSignature: string;
};

export type ViewportExperimentalStatus =
  | 'disabled'
  | 'idle'
  | 'loading'
  | 'ready'
  | 'fallback'
  | 'error';
