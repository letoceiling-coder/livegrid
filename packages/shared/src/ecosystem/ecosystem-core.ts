/** Public profile visibility — moderation can suspend without deleting user. */
export type PublicProfileStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';

export const PUBLIC_PROFILE_STATUSES: PublicProfileStatus[] = ['DRAFT', 'PUBLISHED', 'SUSPENDED'];

export type EcosystemThemeKey = 'default' | 'agency' | 'premium' | 'premium_agency';

export const ECOSYSTEM_THEME_KEYS: EcosystemThemeKey[] = [
  'default',
  'agency',
  'premium',
  'premium_agency',
];

/** Slug-safe: lowercase alphanumeric + hyphens, 3–64 chars. */
export function normalizeEcosystemSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
}

export function isValidEcosystemSlug(slug: string): boolean {
  return /^[\p{L}\p{N}][\p{L}\p{N}-]{1,62}[\p{L}\p{N}]$|^[a-z0-9]{3,64}$/u.test(slug);
}

export function slugFromDisplayName(name: string, suffix = ''): string {
  const base = normalizeEcosystemSlug(name);
  const withSuffix = suffix ? `${base}-${suffix}` : base;
  return withSuffix.slice(0, 64) || 'profile';
}

/** Billing plan → visual theme. Trust scores unchanged. */
export function deriveEcosystemTheme(plan: string | null | undefined): EcosystemThemeKey {
  if (plan === 'PREMIUM_AGENCY') return 'premium_agency';
  if (plan === 'AGENCY') return 'agency';
  if (plan === 'AGENT') return 'premium';
  return 'default';
}

export type ResponseReliabilityLabel = 'fast' | 'typical' | null;

/** Derived from CRM first-response ratio — no star ratings. */
export function deriveResponseReliability(respondedWithin24hPct: number): ResponseReliabilityLabel {
  if (respondedWithin24hPct >= 70) return 'fast';
  if (respondedWithin24hPct >= 40) return 'typical';
  return null;
}

export const RESPONSE_RELIABILITY_LABEL: Record<Exclude<ResponseReliabilityLabel, null>, string> = {
  fast: 'Быстрый ответ',
  typical: 'Стабильный ответ',
};

export type PublicTrustIndicators = {
  agencyVerified: boolean;
  agentTrustScore: number | null;
  avgListingQuality: number | null;
  activeSince: string | null;
  responseReliability: ResponseReliabilityLabel;
  listingCount: number;
};

export type EcosystemDiscoveryKind =
  | 'top'
  | 'verified'
  | 'premium'
  | 'trusted_agents'
  | 'nearby';

export const ECOSYSTEM_AGENCY_DISCOVERY_KINDS = ['top', 'verified', 'premium'] as const;
export const ECOSYSTEM_AGENT_DISCOVERY_KINDS = ['trusted_agents', 'nearby'] as const;
