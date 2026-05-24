/** Rule-based listing quality + trust scoring (Iter 57 — no AI). */

export enum ListingTrustFlagType {
  DUPLICATE_LISTING = 'DUPLICATE_LISTING',
  REPOST_LOOP = 'REPOST_LOOP',
  RAPID_ARCHIVE_REPOST = 'RAPID_ARCHIVE_REPOST',
  CONTACT_SPAM = 'CONTACT_SPAM',
  PROMOTION_CHURN = 'PROMOTION_CHURN',
  GEO_MISMATCH = 'GEO_MISMATCH',
  PRICE_OSCILLATION = 'PRICE_OSCILLATION',
  LOW_QUALITY = 'LOW_QUALITY',
  STALE_LISTING = 'STALE_LISTING',
}

export enum TrustBadgeKind {
  VERIFIED_AGENCY = 'VERIFIED_AGENCY',
  TRUSTED_AGENT = 'TRUSTED_AGENT',
  HIGH_QUALITY_LISTING = 'HIGH_QUALITY_LISTING',
  RECENTLY_VERIFIED = 'RECENTLY_VERIFIED',
}

export const TRUST_BADGE_LABEL: Record<TrustBadgeKind, string> = {
  [TrustBadgeKind.VERIFIED_AGENCY]: 'Проверенное агентство',
  [TrustBadgeKind.TRUSTED_AGENT]: 'Надёжный агент',
  [TrustBadgeKind.HIGH_QUALITY_LISTING]: 'Качественное объявление',
  [TrustBadgeKind.RECENTLY_VERIFIED]: 'Недавно проверено',
};

export const LISTING_TRUST_FLAG_LABEL: Record<ListingTrustFlagType, string> = {
  [ListingTrustFlagType.DUPLICATE_LISTING]: 'Дубликат объявления',
  [ListingTrustFlagType.REPOST_LOOP]: 'Цикл перепубликации',
  [ListingTrustFlagType.RAPID_ARCHIVE_REPOST]: 'Быстрый архив/репост',
  [ListingTrustFlagType.CONTACT_SPAM]: 'Спам контактов',
  [ListingTrustFlagType.PROMOTION_CHURN]: 'Частая смена продвижения',
  [ListingTrustFlagType.GEO_MISMATCH]: 'Несоответствие гео',
  [ListingTrustFlagType.PRICE_OSCILLATION]: 'Подозрительные колебания цены',
  [ListingTrustFlagType.LOW_QUALITY]: 'Низкое качество',
  [ListingTrustFlagType.STALE_LISTING]: 'Устаревшее объявление',
};

export type ListingQualityInput = {
  photoCount: number;
  descriptionLength: number;
  geoQuality: string | null;
  geoConfidence: number | null;
  duplicateClusterSize: number;
  staleDays: number;
  moderationRejectCount: number;
  approvedRatio: number;
  priceChangePct: number | null;
  hasTitle: boolean;
  hasAddress: boolean;
};

export type QualityFactors = {
  photos: number;
  description: number;
  geo: number;
  duplicateRisk: number;
  freshness: number;
  moderation: number;
  agentHistory: number;
  priceStability: number;
};

export type QualityResult = {
  score: number;
  factors: QualityFactors;
};

export type TrustBadge = {
  kind: TrustBadgeKind;
  label: string;
};

export type TrustBadgeInput = {
  qualityScore: number;
  agentTrustScore: number | null;
  agencyVerified: boolean;
  recentlyApproved: boolean;
};

export type ModerationTrustMetrics = {
  rejectRate: number;
  repeatedViolations: number;
  duplicateFrequency: number;
  suspiciousAgentCount: number;
  qualityDistribution: { high: number; medium: number; low: number };
  flaggedListings: number;
  avgQualityScore: number;
};

export type TrustObservabilitySnapshot = {
  qualityScore: number | null;
  trustFlags: string[];
  duplicateWarnings: number;
  anomalyCount: number;
  moderationTrust: ModerationTrustMetrics | null;
  scanMs: number;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,-]/gu, '')
    .trim();
}

/** Deterministic fingerprint key — hash in API layer. */
export function buildListingFingerprintKey(input: {
  title: string | null;
  address: string | null;
  price: number | null;
  regionId: number;
  kind: string;
  areaTotal: number | null;
}): string {
  const priceBucket = input.price != null ? Math.round(input.price / 10_000) * 10_000 : 0;
  const areaBucket = input.areaTotal != null ? Math.round(input.areaTotal) : 0;
  return [
    normalizeText(input.title).slice(0, 80),
    normalizeText(input.address).slice(0, 80),
    priceBucket,
    input.regionId,
    input.kind,
    areaBucket,
  ].join('|');
}

export function computeListingQualityScore(input: ListingQualityInput): QualityResult {
  const photos = clamp(Math.min(20, input.photoCount * 4));
  const descLen = input.descriptionLength;
  const description =
    descLen >= 200 ? 15 : descLen >= 80 ? 10 : descLen >= 30 ? 5 : descLen > 0 ? 2 : 0;
  const hasBasics = (input.hasTitle ? 2 : 0) + (input.hasAddress ? 2 : 0);
  const descScore = clamp(description + hasBasics, 0, 15);

  let geo = 5;
  if (input.geoQuality === 'HIGH') geo = 15;
  else if (input.geoQuality === 'MEDIUM') geo = 10;
  else if (input.geoQuality === 'LOW') geo = 3;
  if (input.geoConfidence != null && input.geoConfidence >= 0.8) geo = Math.min(15, geo + 2);

  const duplicateRisk =
    input.duplicateClusterSize <= 1 ? 15 : input.duplicateClusterSize === 2 ? 8 : 0;

  const freshness =
    input.staleDays <= 7 ? 10 : input.staleDays <= 30 ? 7 : input.staleDays <= 90 ? 4 : 0;

  const moderation =
    input.moderationRejectCount === 0
      ? 10
      : input.moderationRejectCount === 1
        ? 5
        : input.moderationRejectCount === 2
          ? 2
          : 0;

  const agentHistory = clamp(Math.round(input.approvedRatio * 10), 0, 10);

  let priceStability = 5;
  if (input.priceChangePct != null) {
    const abs = Math.abs(input.priceChangePct);
    if (abs <= 5) priceStability = 5;
    else if (abs <= 15) priceStability = 3;
    else if (abs <= 30) priceStability = 1;
    else priceStability = 0;
  }

  const factors: QualityFactors = {
    photos,
    description: descScore,
    geo,
    duplicateRisk,
    freshness,
    moderation,
    agentHistory,
    priceStability,
  };

  const score = clamp(
    photos + descScore + geo + duplicateRisk + freshness + moderation + agentHistory + priceStability,
  );

  return { score, factors };
}

export function deriveTrustBadges(input: TrustBadgeInput): TrustBadge[] {
  const badges: TrustBadge[] = [];
  if (input.agencyVerified) {
    badges.push({ kind: TrustBadgeKind.VERIFIED_AGENCY, label: TRUST_BADGE_LABEL[TrustBadgeKind.VERIFIED_AGENCY] });
  }
  if (input.agentTrustScore != null && input.agentTrustScore >= 75) {
    badges.push({ kind: TrustBadgeKind.TRUSTED_AGENT, label: TRUST_BADGE_LABEL[TrustBadgeKind.TRUSTED_AGENT] });
  }
  if (input.qualityScore >= 80) {
    badges.push({ kind: TrustBadgeKind.HIGH_QUALITY_LISTING, label: TRUST_BADGE_LABEL[TrustBadgeKind.HIGH_QUALITY_LISTING] });
  }
  if (input.recentlyApproved) {
    badges.push({ kind: TrustBadgeKind.RECENTLY_VERIFIED, label: TRUST_BADGE_LABEL[TrustBadgeKind.RECENTLY_VERIFIED] });
  }
  return badges.slice(0, 3);
}
