import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ListingRecoProfile,
  ScoredRecommendation,
  mergeRecommendationScores,
  rankRecommendations,
} from '@lg/shared';
import type { SavedSearchParamsJson } from '@lg/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RetentionMatchService } from '../retention/retention-match.service';
import { DISCOVERY_LIMITS, PUBLIC_LISTING_WHERE } from './discovery.constants';
import { DiscoveryCatalogMapper } from './discovery-catalog.mapper';
import { DiscoveryIntelligenceService } from './discovery-intelligence.service';

type CacheEntry = { at: number; payload: unknown };

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastSignals: string[] = [];
  private lastRelatedMs = 0;
  private lastFeedMs = 0;
  private lastTrendingMs = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: DiscoveryCatalogMapper,
    private readonly intelligence: DiscoveryIntelligenceService,
    private readonly retentionMatch: RetentionMatchService,
  ) {}

  getObservability() {
    return {
      relatedQueryMs: this.lastRelatedMs,
      feedQueryMs: this.lastFeedMs,
      trendingMs: this.lastTrendingMs,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      lastSignals: this.lastSignals,
    };
  }

  private cacheGet<T>(key: string): T | null {
    const row = this.cache.get(key);
    if (!row) {
      this.cacheMisses += 1;
      return null;
    }
    if (Date.now() - row.at > DISCOVERY_LIMITS.cacheTtlMs) {
      this.cache.delete(key);
      this.cacheMisses += 1;
      return null;
    }
    this.cacheHits += 1;
    return row.payload as T;
  }

  private cacheSet(key: string, payload: unknown) {
    if (this.cache.size >= DISCOVERY_LIMITS.cacheMaxEntries) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
    this.cache.set(key, { at: Date.now(), payload });
  }

  async getRelatedToListing(listingId: number, limit?: number) {
    const take = Math.min(limit ?? DISCOVERY_LIMITS.relatedDefault, DISCOVERY_LIMITS.feedMax);
    const cacheKey = `related:listing:${listingId}:${take}`;
    const cached = this.cacheGet<{ data: unknown[]; meta: object }>(cacheKey);
    if (cached) return cached;

    const t0 = Date.now();
    const sourceRow = await this.prisma.listing.findFirst({
      where: { id: listingId, ...PUBLIC_LISTING_WHERE },
      include: this.mapper.cardInclude(),
    });
    if (!sourceRow) throw new NotFoundException('Listing not found');

    const source = DiscoveryCatalogMapper.toProfile(sourceRow);
    const candidates = await this.mapper.fetchCandidatePool({
      regionId: source.regionId,
      excludeIds: [listingId],
      blockId: source.blockId,
      districtId: source.districtId,
      kind: source.kind,
      price: source.price,
    });

    const scored = rankRecommendations(
      source,
      candidates.map((c) => DiscoveryCatalogMapper.toProfile(c)),
      { limit: take, reason: 'similar' },
    );
    this.lastSignals = scored.flatMap((s) => s.signals).slice(0, 12);

    const data = await this.attachScores(scored);
    this.lastRelatedMs = Date.now() - t0;
    const result = {
      data,
      meta: { sourceId: listingId, count: data.length, queryMs: this.lastRelatedMs },
    };
    this.cacheSet(cacheKey, result);
    return result;
  }

  async getRelatedToBlock(blockId: number, limit?: number) {
    const take = Math.min(limit ?? DISCOVERY_LIMITS.relatedDefault, DISCOVERY_LIMITS.feedMax);
    const cacheKey = `related:block:${blockId}:${take}`;
    const cached = this.cacheGet<{ data: unknown[]; meta: object }>(cacheKey);
    if (cached) return cached;

    const t0 = Date.now();
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
      select: { id: true, regionId: true, districtId: true },
    });
    if (!block) throw new NotFoundException('Block not found');

    const anchor = await this.prisma.listing.findFirst({
      where: { blockId, ...PUBLIC_LISTING_WHERE },
      include: this.mapper.cardInclude(),
      orderBy: { createdAt: 'desc' },
    });

    const source: ListingRecoProfile = anchor
      ? DiscoveryCatalogMapper.toProfile(anchor)
      : {
          id: 0,
          regionId: block.regionId,
          kind: 'APARTMENT',
          blockId: block.id,
          districtId: block.districtId,
        };

    const inBlock = await this.prisma.listing.findMany({
      where: { blockId, ...PUBLIC_LISTING_WHERE },
      take,
      include: this.mapper.cardInclude(),
      orderBy: { price: 'asc' },
    });

    let scored: ScoredRecommendation[] = inBlock.map((r) => ({
      id: r.id,
      score: 100,
      signals: ['same_block'],
      reason: 'block',
    }));

    if (scored.length < take) {
      const extra = await this.mapper.fetchCandidatePool({
        regionId: block.regionId,
        excludeIds: scored.map((s) => s.id),
        districtId: block.districtId,
        kind: source.kind,
        price: source.price,
        blockOnly: false,
      });
      const ranked = rankRecommendations(
        source,
        extra.map((c) => DiscoveryCatalogMapper.toProfile(c)),
        { limit: take - scored.length, reason: 'similar' },
      );
      scored = [...scored, ...ranked];
    }

    scored = scored.slice(0, take);
    const data = await this.attachScores(scored);
    this.lastRelatedMs = Date.now() - t0;
    const result = {
      data,
      meta: { blockId, count: data.length, queryMs: this.lastRelatedMs },
    };
    this.cacheSet(cacheKey, result);
    return result;
  }

  async getPersonalizedFeed(userId: string, page = 1, perPage?: number) {
    const take = Math.min(perPage ?? DISCOVERY_LIMITS.feedDefault, DISCOVERY_LIMITS.feedMax);
    const cacheKey = `feed:${userId}:${page}:${take}`;
    const cached = this.cacheGet<{ data: unknown[]; meta: object }>(cacheKey);
    if (cached) return cached;

    const t0 = Date.now();
    const [favorites, history, searches, trending] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId, listingId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: DISCOVERY_LIMITS.favoritesSeed,
        select: { listingId: true, blockId: true },
      }),
      this.prisma.userBrowseHistory.findMany({
        where: { userId, entityKind: 'LISTING' },
        orderBy: { viewedAt: 'desc' },
        take: DISCOVERY_LIMITS.historySeed,
      }),
      this.prisma.savedSearch.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: DISCOVERY_LIMITS.savedSearchSeed,
      }),
      this.intelligence.getTrendingListingIds(undefined, DISCOVERY_LIMITS.trendingPool),
    ]);

    const favoriteBlockIds = new Set(
      favorites.map((f) => f.blockId).filter((id): id is number => id != null),
    );
    const viewedIds = new Set(history.map((h) => h.entityId));
    const trendingIds = new Set(trending.map((t) => t.listingId));
    const excludeIds = new Set<number>([...viewedIds]);

    const batches: Array<{ items: ScoredRecommendation[]; reason: string }> = [];

    const seedListingIds = [
      ...favorites.map((f) => f.listingId).filter((id): id is number => id != null),
      ...history.map((h) => h.entityId),
    ].slice(0, 10);

    const profiles = await this.mapper.loadProfilesByIds([...new Set(seedListingIds)]);

    for (const fav of favorites) {
      if (!fav.listingId) continue;
      const src = profiles.get(fav.listingId);
      if (!src) continue;
      const pool = await this.mapper.fetchCandidatePool({
        regionId: src.regionId,
        excludeIds: [...excludeIds, fav.listingId],
        blockId: src.blockId,
        districtId: src.districtId,
        kind: src.kind,
        price: src.price,
      });
      batches.push({
        reason: 'favorite',
        items: rankRecommendations(
          src,
          pool.map((p) => DiscoveryCatalogMapper.toProfile(p)),
          {
            limit: 6,
            reason: 'favorite',
            ctx: { favoriteBlockIds, trendingListingIds: trendingIds },
          },
        ),
      });
    }

    for (const h of history.slice(0, 5)) {
      const src = profiles.get(h.entityId);
      if (!src) continue;
      const pool = await this.mapper.fetchCandidatePool({
        regionId: src.regionId,
        excludeIds: [...excludeIds, h.entityId],
        districtId: src.districtId,
        kind: src.kind,
        price: src.price,
      });
      batches.push({
        reason: 'viewed',
        items: rankRecommendations(
          src,
          pool.map((p) => DiscoveryCatalogMapper.toProfile(p)),
          {
            limit: 4,
            reason: 'viewed',
            ctx: { viewedListingIds: viewedIds, trendingListingIds: trendingIds },
          },
        ),
      });
    }

    const savedSearchMatchIds = new Set<number>();
    for (const search of searches) {
      try {
        const matches = await this.retentionMatch.findMatches(
          search.paramsJson as SavedSearchParamsJson,
          { limit: DISCOVERY_LIMITS.matchesPerSearch },
        );
        for (const m of matches) savedSearchMatchIds.add(m.id);
      } catch (e) {
        this.logger.warn(`saved search match failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (savedSearchMatchIds.size) {
      const ids = [...savedSearchMatchIds].filter((id) => !excludeIds.has(id)).slice(0, take);
      batches.push({
        reason: 'saved_search',
        items: ids.map((id) => ({
          id,
          score: 60,
          signals: ['saved_search_match'],
          reason: 'saved_search',
        })),
      });
    }

    if (trending.length) {
      batches.push({
        reason: 'trending',
        items: trending
          .filter((t) => !excludeIds.has(t.listingId))
          .slice(0, 8)
          .map((t) => ({
            id: t.listingId,
            score: 40 + t.score,
            signals: ['trending'],
            reason: 'trending',
          })),
      });
    }

    const merged = mergeRecommendationScores(batches, take * page);
    const start = (page - 1) * take;
    const pageItems = merged.slice(start, start + take);
    this.lastSignals = pageItems.flatMap((s) => s.signals).slice(0, 12);

    const data = await this.attachScores(pageItems);
    this.lastFeedMs = Date.now() - t0;
    const result = {
      data,
      meta: {
        page,
        per_page: take,
        total: merged.length,
        total_pages: Math.ceil(merged.length / take) || 1,
        queryMs: this.lastFeedMs,
        coldStart: seedListingIds.length === 0 && searches.length === 0,
      },
    };
    this.cacheSet(cacheKey, result);
    return result;
  }

  async getColdStartFeed(regionId?: number, limit?: number) {
    const take = limit ?? DISCOVERY_LIMITS.feedDefault;
    const trending = await this.intelligence.getTrendingListingIds(regionId, take);
    const scored = trending.map((t) => ({
      id: t.listingId,
      score: t.score,
      signals: ['trending'],
      reason: 'trending' as const,
    }));
    return {
      data: await this.attachScores(scored),
      meta: { coldStart: true, count: scored.length },
    };
  }

  private async attachScores(scored: ScoredRecommendation[]) {
    const cards = await this.mapper.hydrateCards(scored.map((s) => s.id));
    const scoreById = new Map(scored.map((s) => [s.id, s]));
    return cards
      .map((card) => {
        if (!card) return null;
        const s = scoreById.get(card.id);
        return {
          ...card,
          recommendation: {
            score: s?.score ?? 0,
            signals: s?.signals ?? [],
            reason: s?.reason ?? 'similar',
          },
        };
      })
      .filter(Boolean);
  }
}
