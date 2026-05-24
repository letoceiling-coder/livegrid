import { Injectable } from '@nestjs/common';
import { computeAgencyRankScore, computeAgentRankScore } from '@lg/shared';
import { EcosystemAgencyService } from './ecosystem-agency.service';
import { EcosystemAgentService } from './ecosystem-agent.service';
import { ECOSYSTEM_DISCOVERY_LIMIT } from './ecosystem.constants';

type AgencyDiscoveryKind = 'top' | 'verified' | 'premium';

@Injectable()
export class EcosystemDiscoveryService {
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastRankMs = 0;

  constructor(
    private readonly agencies: EcosystemAgencyService,
    private readonly agents: EcosystemAgentService,
  ) {}

  getObservability() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      lastRankMs: this.lastRankMs,
    };
  }

  async discoverAgencies(kind: AgencyDiscoveryKind = 'top', regionId?: number) {
    const started = Date.now();
    this.cacheMisses += 1;
    const candidates = await this.agencies.listCandidates();

    const scored = await Promise.all(
      candidates.map(async (p) => {
        const listingCount = await this.agencies.countPublicListings(p.userId);
        const avgQuality = await this.agencies.avgListingQuality(p.userId);
        const verified = p.user.agencyVerification?.status === 'VERIFIED';
        const plan = p.user.billingAccount?.plan ?? null;

        if (kind === 'verified' && !verified) return null;
        if (kind === 'premium' && plan !== 'PREMIUM_AGENCY' && plan !== 'AGENCY') return null;

        const regionIds = Array.isArray(p.regionIdsJson) ? (p.regionIdsJson as number[]) : [];
        if (regionId && regionIds.length && !regionIds.includes(regionId)) return null;

        const score = computeAgencyRankScore({
          userId: p.userId,
          listingCount,
          avgQualityScore: avgQuality ?? 0,
          agencyVerified: verified,
          billingPlan: plan,
          agentTrustScore: p.user.agentTrustScore?.trustScore ?? null,
          lastActivityAt: null,
        });

        return {
          slug: p.slug,
          displayName: p.displayName,
          logoUrl: p.logoUrl,
          listingCount,
          avgQualityScore: avgQuality,
          verified,
          billingPlan: plan,
          score,
        };
      }),
    );

    const data = scored
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, ECOSYSTEM_DISCOVERY_LIMIT);

    this.lastRankMs = Date.now() - started;
    return { kind, data, computeMs: this.lastRankMs };
  }

  async discoverAgents(kind: 'trusted_agents' | 'nearby' = 'trusted_agents', regionId?: number) {
    const started = Date.now();
    this.cacheMisses += 1;
    const candidates = await this.agents.listCandidates();

    const scored = await Promise.all(
      candidates.map(async (p) => {
        const trust = p.user.agentTrustScore?.trustScore ?? 0;
        if (kind === 'trusted_agents' && trust < 60) return null;

        const listingCount = await this.agencies.countPublicListings(p.userId);
        const avgQuality = await this.agencies.avgListingQuality(p.userId);
        const regionIds = Array.isArray(p.regionIdsJson) ? (p.regionIdsJson as number[]) : [];
        if (regionId && regionIds.length && !regionIds.includes(regionId)) return null;

        const score = computeAgentRankScore({
          trustScore: trust,
          listingCount,
          avgQualityScore: avgQuality ?? 0,
          agencyVerified: p.user.agencyVerification?.status === 'VERIFIED',
        });

        return {
          slug: p.slug,
          name: p.user.fullName,
          avatarUrl: p.user.avatarUrl,
          trustScore: trust,
          listingCount,
          score,
        };
      }),
    );

    const data = scored
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, ECOSYSTEM_DISCOVERY_LIMIT);

    this.lastRankMs = Date.now() - started;
    return { kind, data, computeMs: this.lastRankMs };
  }
}
