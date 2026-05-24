import { describe, it, expect } from 'vitest';
import {
  deriveEcosystemTheme,
  deriveResponseReliability,
  isValidEcosystemSlug,
  normalizeEcosystemSlug,
  slugFromDisplayName,
} from './ecosystem-core.js';
import { computeAgencyRankScore, computeAgentRankScore, resolvePublicTheme } from './ecosystem-ranking.js';

describe('ecosystem slugs', () => {
  it('normalizes display names', () => {
    expect(normalizeEcosystemSlug('  Live Grid Agency  ')).toBe('live-grid-agency');
    expect(isValidEcosystemSlug('live-grid-agency')).toBe(true);
    expect(isValidEcosystemSlug('ab')).toBe(false);
  });

  it('slugFromDisplayName', () => {
    expect(slugFromDisplayName('Test Agency', '1')).toMatch(/^test-agency/);
  });
});

describe('ecosystem themes', () => {
  it('billing plan maps to theme', () => {
    expect(deriveEcosystemTheme('PREMIUM_AGENCY')).toBe('premium_agency');
    expect(deriveEcosystemTheme('FREE')).toBe('default');
  });

  it('resolvePublicTheme prefers billing', () => {
    expect(resolvePublicTheme('AGENCY', 'default')).toBe('agency');
  });
});

describe('ecosystem ranking', () => {
  it('verified agency ranks higher', () => {
    const verified = computeAgencyRankScore({
      userId: 'a',
      listingCount: 10,
      avgQualityScore: 80,
      agencyVerified: true,
      billingPlan: 'AGENCY',
      agentTrustScore: 80,
      lastActivityAt: null,
    });
    const unverified = computeAgencyRankScore({
      userId: 'b',
      listingCount: 10,
      avgQualityScore: 80,
      agencyVerified: false,
      billingPlan: 'FREE',
      agentTrustScore: null,
      lastActivityAt: null,
    });
    expect(verified).toBeGreaterThan(unverified);
  });

  it('agent rank bounded 0-100', () => {
    const s = computeAgentRankScore({
      trustScore: 90,
      listingCount: 20,
      avgQualityScore: 85,
      agencyVerified: true,
    });
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThan(50);
  });
});

describe('response reliability', () => {
  it('no label below threshold', () => {
    expect(deriveResponseReliability(30)).toBeNull();
    expect(deriveResponseReliability(75)).toBe('fast');
  });
});
