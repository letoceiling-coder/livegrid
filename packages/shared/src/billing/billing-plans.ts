/** Subscription plan identifiers — operational billing, no payment gateway. */
export type BillingPlanId = 'FREE' | 'AGENT' | 'AGENCY' | 'PREMIUM_AGENCY';

export const BILLING_PLAN_IDS: BillingPlanId[] = [
  'FREE',
  'AGENT',
  'AGENCY',
  'PREMIUM_AGENCY',
];

export type BillingQuotas = {
  activeListings: number;
  promotions: number;
  savedSearches: number;
  crmSeats: number;
};

export const BILLING_PLAN_QUOTAS: Record<BillingPlanId, BillingQuotas> = {
  FREE: { activeListings: 3, promotions: 0, savedSearches: 5, crmSeats: 0 },
  AGENT: { activeListings: 25, promotions: 2, savedSearches: 20, crmSeats: 1 },
  AGENCY: { activeListings: 100, promotions: 10, savedSearches: 50, crmSeats: 5 },
  PREMIUM_AGENCY: { activeListings: 500, promotions: 50, savedSearches: 200, crmSeats: 20 },
};

export const BILLING_PLAN_LABEL: Record<BillingPlanId, string> = {
  FREE: 'Бесплатный',
  AGENT: 'Агент',
  AGENCY: 'Агентство',
  PREMIUM_AGENCY: 'Premium Agency',
};

export type QuotaUsage = BillingQuotas & {
  automationVolume24h: number;
  notificationVolume24h: number;
};

export type QuotaPressure = {
  plan: BillingPlanId;
  quotas: BillingQuotas;
  usage: QuotaUsage;
  /** 0–100 per dimension */
  pressurePct: Record<keyof BillingQuotas, number>;
  /** true when any dimension >= 90% — advisory only, no destructive enforcement */
  atLimit: boolean;
};

export function computeQuotaPressure(
  plan: BillingPlanId,
  usage: QuotaUsage,
): QuotaPressure {
  const quotas = BILLING_PLAN_QUOTAS[plan];
  const pct = (used: number, limit: number) =>
    limit <= 0 ? (used > 0 ? 100 : 0) : Math.min(100, Math.round((used / limit) * 100));

  const pressurePct = {
    activeListings: pct(usage.activeListings, quotas.activeListings),
    promotions: pct(usage.promotions, quotas.promotions),
    savedSearches: pct(usage.savedSearches, quotas.savedSearches),
    crmSeats: pct(usage.crmSeats, quotas.crmSeats),
  };

  const atLimit = Object.values(pressurePct).some((p) => p >= 90);

  return { plan, quotas, usage, pressurePct, atLimit };
}

export function assertWithinQuota(
  plan: BillingPlanId,
  dimension: keyof BillingQuotas,
  currentUsage: number,
): { allowed: boolean; limit: number; remaining: number } {
  const limit = BILLING_PLAN_QUOTAS[plan][dimension];
  if (limit <= 0) {
    return { allowed: false, limit, remaining: 0 };
  }
  const remaining = Math.max(0, limit - currentUsage);
  return { allowed: currentUsage < limit, limit, remaining };
}

/** Default plan by user role — additive bootstrap only. */
export function defaultPlanForRole(role: string): BillingPlanId {
  if (role === 'admin' || role === 'editor') return 'PREMIUM_AGENCY';
  if (role === 'manager') return 'AGENCY';
  if (role === 'agent') return 'AGENT';
  return 'FREE';
}
