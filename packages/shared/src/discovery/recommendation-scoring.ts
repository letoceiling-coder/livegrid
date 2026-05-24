/** Rule-based listing recommendation scoring — no ML/embeddings. */

export const RECOMMENDATION_WEIGHTS = {
  SAME_BLOCK: 40,
  SAME_DISTRICT: 25,
  SAME_REGION: 8,
  SAME_KIND: 12,
  PRICE_SIMILAR: 20,
  ROOMS_SIMILAR: 15,
  AREA_SIMILAR: 10,
  GEO_NEARBY: 18,
  FAVORITE_BLOCK: 22,
  BROWSE_AFFINITY: 18,
  SAVED_SEARCH: 25,
  TRENDING: 15,
  PROMOTION: 8,
} as const;

export type ListingRecoProfile = {
  id: number;
  regionId: number;
  kind: string;
  blockId?: number | null;
  districtId?: number | null;
  price?: number | null;
  lat?: number | null;
  lng?: number | null;
  roomTypeId?: number | null;
  areaTotal?: number | null;
  vipPriority?: number;
  boostScore?: number;
};

export type ScoredRecommendation = {
  id: number;
  score: number;
  signals: string[];
  reason?: string;
};

export type ScoreContext = {
  favoriteBlockIds?: Set<number>;
  viewedListingIds?: Set<number>;
  trendingListingIds?: Set<number>;
  savedSearchMatchIds?: Set<number>;
};

const EARTH_RADIUS_M = 6_371_000;

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLng = (lng2 - lng1) * r;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function priceSimilarityScore(source: number | null, candidate: number | null): number {
  if (source == null || candidate == null || source <= 0) return 0;
  const ratio = candidate / source;
  if (ratio >= 0.75 && ratio <= 1.25) return RECOMMENDATION_WEIGHTS.PRICE_SIMILAR;
  if (ratio >= 0.55 && ratio <= 1.45) return Math.round(RECOMMENDATION_WEIGHTS.PRICE_SIMILAR * 0.5);
  return 0;
}

export function areaSimilarityScore(source: number | null, candidate: number | null): number {
  if (source == null || candidate == null || source <= 0) return 0;
  const ratio = candidate / source;
  if (ratio >= 0.8 && ratio <= 1.2) return RECOMMENDATION_WEIGHTS.AREA_SIMILAR;
  if (ratio >= 0.65 && ratio <= 1.35) return Math.round(RECOMMENDATION_WEIGHTS.AREA_SIMILAR * 0.5);
  return 0;
}

export function scoreListingSimilarity(
  source: ListingRecoProfile,
  candidate: ListingRecoProfile,
  ctx: ScoreContext = {},
): ScoredRecommendation {
  let score = 0;
  const signals: string[] = [];

  if (candidate.id === source.id) {
    return { id: candidate.id, score: 0, signals: ['self'] };
  }

  if (candidate.regionId === source.regionId) {
    score += RECOMMENDATION_WEIGHTS.SAME_REGION;
    signals.push('same_region');
  } else {
    return { id: candidate.id, score: 0, signals: ['region_mismatch'] };
  }

  if (candidate.kind === source.kind) {
    score += RECOMMENDATION_WEIGHTS.SAME_KIND;
    signals.push('same_kind');
  }

  if (source.blockId && candidate.blockId === source.blockId) {
    score += RECOMMENDATION_WEIGHTS.SAME_BLOCK;
    signals.push('same_block');
  }

  if (source.districtId && candidate.districtId === source.districtId) {
    score += RECOMMENDATION_WEIGHTS.SAME_DISTRICT;
    signals.push('same_district');
  }

  const pricePts = priceSimilarityScore(source.price ?? null, candidate.price ?? null);
  if (pricePts) {
    score += pricePts;
    signals.push('price_similar');
  }

  if (source.roomTypeId && candidate.roomTypeId === source.roomTypeId) {
    score += RECOMMENDATION_WEIGHTS.ROOMS_SIMILAR;
    signals.push('rooms_similar');
  }

  const areaPts = areaSimilarityScore(source.areaTotal ?? null, candidate.areaTotal ?? null);
  if (areaPts) {
    score += areaPts;
    signals.push('area_similar');
  }

  const sLat = toNum(source.lat);
  const sLng = toNum(source.lng);
  const cLat = toNum(candidate.lat);
  const cLng = toNum(candidate.lng);
  if (sLat != null && sLng != null && cLat != null && cLng != null) {
    const dist = haversineMeters(sLat, sLng, cLat, cLng);
    if (dist <= 2000) {
      score += RECOMMENDATION_WEIGHTS.GEO_NEARBY;
      signals.push('geo_nearby');
    } else if (dist <= 5000) {
      score += Math.round(RECOMMENDATION_WEIGHTS.GEO_NEARBY * 0.45);
      signals.push('geo_near');
    }
  }

  if (candidate.blockId && ctx.favoriteBlockIds?.has(candidate.blockId)) {
    score += RECOMMENDATION_WEIGHTS.FAVORITE_BLOCK;
    signals.push('favorite_block');
  }

  if (ctx.viewedListingIds?.has(candidate.id)) {
    score += Math.round(RECOMMENDATION_WEIGHTS.BROWSE_AFFINITY * 0.3);
    signals.push('viewed_before');
  }

  if (ctx.savedSearchMatchIds?.has(candidate.id)) {
    score += RECOMMENDATION_WEIGHTS.SAVED_SEARCH;
    signals.push('saved_search_match');
  }

  if (ctx.trendingListingIds?.has(candidate.id)) {
    score += RECOMMENDATION_WEIGHTS.TRENDING;
    signals.push('trending');
  }

  const promo = (candidate.vipPriority ?? 0) + (candidate.boostScore ?? 0) * 0.01;
  if (promo > 0) {
    score += Math.min(RECOMMENDATION_WEIGHTS.PROMOTION, Math.round(promo));
    signals.push('promotion');
  }

  return { id: candidate.id, score, signals };
}

export function rankRecommendations(
  source: ListingRecoProfile,
  candidates: ListingRecoProfile[],
  opts: { limit?: number; ctx?: ScoreContext; reason?: string } = {},
): ScoredRecommendation[] {
  const limit = opts.limit ?? 12;
  const scored = candidates
    .map((c) => {
      const row = scoreListingSimilarity(source, c, opts.ctx);
      if (opts.reason && row.score > 0) row.reason = opts.reason;
      return row;
    })
    .filter((r) => r.score > 0 && !r.signals.includes('self'))
    .sort((a, b) => b.score - a.score);

  const seen = new Set<number>();
  const out: ScoredRecommendation[] = [];
  for (const row of scored) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export function mergeRecommendationScores(
  batches: Array<{ items: ScoredRecommendation[]; reason: string }>,
  limit = 12,
): ScoredRecommendation[] {
  const merged = new Map<number, ScoredRecommendation>();

  for (const batch of batches) {
    for (const item of batch.items) {
      const prev = merged.get(item.id);
      if (!prev || item.score > prev.score) {
        merged.set(item.id, { ...item, reason: item.reason ?? batch.reason });
      } else if (prev) {
        prev.score += Math.round(item.score * 0.35);
        prev.signals = [...new Set([...prev.signals, ...item.signals])];
      }
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const RECOMMENDATION_REASON_LABEL: Record<string, string> = {
  viewed: 'Вы смотрели похожие',
  favorite: 'Похоже на избранное',
  saved_search: 'Подходит под сохранённый поиск',
  trending: 'Популярное рядом',
  similar: 'Похожие объекты',
  block: 'В этом ЖК и рядом',
};
