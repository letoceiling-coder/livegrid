import type { BillingPlanId } from '../billing/billing-plans.js';
import { deriveEcosystemTheme, type EcosystemThemeKey } from './ecosystem-core.js';

export type AgencyRankInput = {
  userId: string;
  listingCount: number;
  avgQualityScore: number;
  agencyVerified: boolean;
  billingPlan: BillingPlanId | string | null;
  agentTrustScore: number | null;
  lastActivityAt: Date | string | null;
};

/** Bounded deterministic score — no fake reviews. */
export function computeAgencyRankScore(input: AgencyRankInput): number {
  let score = 0;
  if (input.agencyVerified) score += 40;
  score += Math.min(25, input.listingCount);
  score += Math.min(20, Math.round((input.avgQualityScore ?? 0) / 5));
  if (input.billingPlan === 'PREMIUM_AGENCY') score += 15;
  else if (input.billingPlan === 'AGENCY') score += 8;
  if (input.agentTrustScore != null && input.agentTrustScore >= 75) score += 10;
  return Math.min(100, score);
}

export function computeAgentRankScore(input: {
  trustScore: number;
  listingCount: number;
  avgQualityScore: number;
  agencyVerified: boolean;
}): number {
  let score = Math.min(50, Math.round(input.trustScore / 2));
  score += Math.min(25, input.listingCount * 2);
  score += Math.min(15, Math.round((input.avgQualityScore ?? 0) / 6));
  if (input.agencyVerified) score += 10;
  return Math.min(100, score);
}

export function themeClasses(theme: EcosystemThemeKey): {
  banner: string;
  accent: string;
  chip: string;
} {
  switch (theme) {
    case 'premium_agency':
      return {
        banner: 'bg-gradient-to-r from-amber-600/90 to-amber-800/90',
        accent: 'text-amber-700',
        chip: 'bg-amber-500/10 text-amber-800 border-amber-500/25',
      };
    case 'agency':
      return {
        banner: 'bg-gradient-to-r from-blue-600/85 to-indigo-700/85',
        accent: 'text-blue-700',
        chip: 'bg-blue-500/10 text-blue-800 border-blue-500/25',
      };
    case 'premium':
      return {
        banner: 'bg-gradient-to-r from-violet-600/85 to-purple-700/85',
        accent: 'text-violet-700',
        chip: 'bg-violet-500/10 text-violet-800 border-violet-500/25',
      };
    default:
      return {
        banner: 'bg-gradient-to-r from-slate-600/80 to-slate-800/80',
        accent: 'text-primary',
        chip: 'bg-muted text-foreground border-border',
      };
  }
}

export function resolvePublicTheme(
  billingPlan: string | null | undefined,
  profileThemeKey: string | null | undefined,
): EcosystemThemeKey {
  const fromBilling = deriveEcosystemTheme(billingPlan);
  if (fromBilling !== 'default') return fromBilling;
  const key = profileThemeKey as EcosystemThemeKey | undefined;
  if (key && ['default', 'agency', 'premium', 'premium_agency'].includes(key)) return key;
  return 'default';
}
