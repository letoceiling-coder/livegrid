import { useState, useRef, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Building2, Home, TreePine, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import CatalogSearchHintsDropdown from '@/redesign/components/CatalogSearchHintsDropdown';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import type { CatalogHints } from '@/redesign/lib/catalog-hints-types';
import { catalogFiltersIntoSearchParams } from '@/redesign/lib/catalog-url-sync';
import {
  buildBlocksSearchParams,
  buildListingsSearchParams,
  hasNarrowingFilters,
  LISTING_KIND_BY_OBJECT_TYPE,
} from '@/redesign/lib/catalog-api-params';
import type { CatalogFilters, ObjectType } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';
import RegionSelector from '@/redesign/components/RegionSelector';
import {
  getCatalogFilterVisibility,
  heroDeadlineFromFilters,
  heroLabelFromRoomCategories,
  HERO_DEADLINE_LABELS,
  HERO_ROOM_TYPE_LABELS,
  filtersFromHeroDeadline,
  isMoscowRegion,
  OBJECT_TYPE_TABS,
  resetFiltersForObjectType,
  roomCategoriesFromHeroLabel,
} from '@/redesign/lib/catalog-filter-config';
import { heroDigitsToRubles } from '@/redesign/lib/catalog-url-sync';

const objectTabIcons: Record<ObjectType, typeof Building2> = {
  apartments: Building2,
  rooms: Building2,
  houses: Home,
  land: TreePine,
  dachas: Home,
  commercial: Store,
};

function useDebouncedCatalogFilters(filters: CatalogFilters, ms: number): CatalogFilters {
  const [debounced, setDebounced] = useState(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), ms);
    return () => clearTimeout(t);
  }, [filters, ms]);
  return debounced;
}

const HeroSearch = () => {
  const [filters, setFilters] = useState<CatalogFilters>(() => ({ ...defaultFilters }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [priceFromStr, setPriceFromStr] = useState('');
  const [priceToStr, setPriceToStr] = useState('');

  const navigate = useNavigate();
  const { data: regionId, rows: regionRows, setStoredRegionId } = useDefaultRegionId();
  const debouncedFilters = useDebouncedCatalogFilters(filters, 450);
  const deferredSearch = useDeferredValue(filters.search.trim());

  const visibility = getCatalogFilterVisibility(filters.objectType, {
    marketType: filters.marketType,
    hasBlocks: true,
  });

  const isMoscow = isMoscowRegion(regionRows, regionId);
  const listingKind = LISTING_KIND_BY_OBJECT_TYPE[debouncedFilters.objectType];
  const isApartmentMode = debouncedFilters.objectType === 'apartments';
  const useSecondaryMarket = isApartmentMode && debouncedFilters.marketType === 'secondary';

  const hintsEnabled =
    isApartmentMode && searchFocused && deferredSearch.length >= 2 && regionId != null;

  const { data: catalogHints, isFetching: hintsLoading } = useQuery({
    queryKey: ['search', 'catalog-hints', regionId, deferredSearch],
    queryFn: () =>
      apiGet<CatalogHints>(
        `/search/catalog-hints?region_id=${regionId}&q=${encodeURIComponent(deferredSearch)}&limit=30`,
      ),
    enabled: hintsEnabled,
    staleTime: 20_000,
  });

  const districtsQuery = useQuery({
    queryKey: ['districts', regionId, listingKind],
    queryFn: () => apiGet<{ name: string }[]>(`/districts?region_id=${regionId}&kind=${listingKind}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const subwaysQuery = useQuery({
    queryKey: ['subways', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/subways?region_id=${regionId}`),
    enabled: regionId != null && isMoscow,
    select: (r) => r.map((x) => x.name),
  });

  const buildersQuery = useQuery({
    queryKey: ['builders', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/builders?region_id=${regionId}`),
    enabled: regionId != null && isApartmentMode,
    select: (r) => r.map((x) => x.name),
  });

  const deadlinesQuery = useQuery({
    queryKey: ['blocks', 'deadlines', regionId],
    queryFn: () => apiGet<string[]>(`/blocks/deadlines?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId) && isApartmentMode,
    staleTime: 5 * 60 * 1000,
  });

  const catalogCountParams = useMemo(() => {
    if (regionId == null || !isApartmentMode || useSecondaryMarket) return null;
    return buildBlocksSearchParams({ filters: debouncedFilters, regionId }).toString();
  }, [regionId, isApartmentMode, useSecondaryMarket, debouncedFilters]);

  const listingHeroCountParams = useMemo(() => {
    if (regionId == null) return null;
    if (isApartmentMode && !useSecondaryMarket) return null;
    return buildListingsSearchParams({
      filters: debouncedFilters,
      regionId,
      kind: isApartmentMode ? 'APARTMENT' : LISTING_KIND_BY_OBJECT_TYPE[debouncedFilters.objectType],
      page: 1,
      perPage: 1,
    }).toString();
  }, [regionId, isApartmentMode, useSecondaryMarket, debouncedFilters]);

  const apartmentFallbackCountParams = useMemo(() => {
    if (regionId == null || !isApartmentMode || useSecondaryMarket) return null;
    return buildListingsSearchParams({
      filters: debouncedFilters,
      regionId,
      kind: 'APARTMENT',
      page: 1,
      perPage: 1,
    }).toString();
  }, [regionId, isApartmentMode, useSecondaryMarket, debouncedFilters]);

  const { data: catalogStats } = useQuery({
    queryKey: ['blocks', 'catalog-counts', catalogCountParams],
    queryFn: () =>
      apiGet<{ blocks: number; apartments: number }>(`/blocks/catalog-counts?${catalogCountParams}`),
    enabled: catalogCountParams != null,
    staleTime: 30_000,
  });

  const { data: listingMarketCount } = useQuery({
    queryKey: ['listings', 'hero-count', listingHeroCountParams],
    queryFn: () => apiGet<{ meta: { total: number } }>(`/listings?${listingHeroCountParams}`),
    enabled: listingHeroCountParams != null,
    staleTime: 30_000,
  });

  const { data: apartmentFallbackCount } = useQuery({
    queryKey: ['listings', 'hero-apt-fallback-count', apartmentFallbackCountParams],
    queryFn: () => apiGet<{ meta: { total: number } }>(`/listings?${apartmentFallbackCountParams}`),
    enabled: apartmentFallbackCountParams != null,
    staleTime: 30_000,
  });

  const { data: kindCounts } = useQuery({
    queryKey: ['stats', 'listing-kind-counts', regionId],
    queryFn: () => apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${regionId}`),
    enabled: regionId != null,
    staleTime: 60_000,
  });

  const switchObjectType = useCallback((nextType: ObjectType) => {
    setFilters((prev) => resetFiltersForObjectType(prev, nextType));
    setPriceFromStr('');
    setPriceToStr('');
    setPtOpen(false);
    setDlOpen(false);
  }, []);

  const syncPriceToFilters = useCallback((from: string, to: string) => {
    setFilters((prev) => ({
      ...prev,
      priceMin: heroDigitsToRubles(from),
      priceMax: heroDigitsToRubles(to),
    }));
  }, []);

  const searchRef = useRef<HTMLDivElement>(null);
  const ptRef = useRef<HTMLDivElement>(null);
  const dlRef = useRef<HTMLDivElement>(null);

  const doSearch = () => {
    const params = catalogFiltersIntoSearchParams(new URLSearchParams(), debouncedFilters);
    if (regionId != null) params.set('region_id', String(regionId));
    navigate(`/catalog?${params.toString()}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (ptRef.current && !ptRef.current.contains(e.target as Node)) setPtOpen(false);
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roomLabel = heroLabelFromRoomCategories(filters.rooms);
  const deadlineLabel = heroDeadlineFromFilters(filters.deadline);

  const showHintsPanel = isApartmentMode && searchFocused && filters.search.trim().length >= 2 && regionId != null;

  const nonAptTotal = listingMarketCount?.meta?.total;

  const ctaLabel = useMemo(() => {
    if (isApartmentMode) {
      if (useSecondaryMarket) {
        const t = listingMarketCount?.meta?.total;
        if (t != null && t > 0) return `${t.toLocaleString('ru')} квартир →`;
        if (t === 0) return 'Нет квартир →';
        return 'Найти →';
      }
      const blocks = catalogStats?.blocks ?? 0;
      const apartmentsInBlocks = catalogStats?.apartments ?? 0;
      if (blocks > 0) {
        return `${apartmentsInBlocks.toLocaleString('ru')} квартир в ${blocks.toLocaleString('ru')} ЖК →`;
      }
      if (catalogStats == null) return 'Найти →';
      const fallbackTotal = apartmentFallbackCount?.meta?.total;
      if (fallbackTotal != null && fallbackTotal > 0) return `${fallbackTotal.toLocaleString('ru')} квартир →`;
      if (fallbackTotal === 0) return 'Нет квартир в этом регионе';
      return 'Найти →';
    }
    if (nonAptTotal != null) {
      if (nonAptTotal > 0) {
        const word =
          filters.objectType === 'houses'
            ? 'домов'
            : filters.objectType === 'land'
              ? 'участков'
              : filters.objectType === 'commercial'
                ? 'объектов'
                : filters.objectType === 'rooms'
                  ? 'комнат'
                  : 'объектов';
        return `${nonAptTotal.toLocaleString('ru')} ${word} →`;
      }
      return 'Нет лотов →';
    }
    const k = LISTING_KIND_BY_OBJECT_TYPE[filters.objectType];
    const n = !hasNarrowingFilters(debouncedFilters) && kindCounts ? (kindCounts[k] ?? 0) : 0;
    if (n > 0) {
      const word =
        filters.objectType === 'houses'
          ? 'домов'
          : filters.objectType === 'land'
            ? 'участков'
            : filters.objectType === 'commercial'
              ? 'объектов'
              : 'объектов';
      return `${n.toLocaleString('ru')} ${word} →`;
    }
    return 'Найти →';
  }, [
    isApartmentMode,
    useSecondaryMarket,
    listingMarketCount,
    catalogStats,
    apartmentFallbackCount,
    nonAptTotal,
    debouncedFilters,
    kindCounts,
    filters.objectType,
  ]);

  const apartmentsHeadlineCount = useMemo(() => {
    if (!isApartmentMode) return 0;
    if (useSecondaryMarket && listingMarketCount?.meta?.total != null) {
      return listingMarketCount.meta.total;
    }
    const fromStats = catalogStats?.apartments ?? 0;
    if (fromStats > 0) return fromStats;
    const fallbackApt = apartmentFallbackCount?.meta?.total ?? 0;
    if (fallbackApt > 0) return fallbackApt;
    if (!hasNarrowingFilters(debouncedFilters)) {
      return kindCounts?.APARTMENT ?? 0;
    }
    return 0;
  }, [
    isApartmentMode,
    useSecondaryMarket,
    listingMarketCount,
    catalogStats,
    apartmentFallbackCount,
    debouncedFilters,
    kindCounts,
  ]);

  const heroSubtitle = useMemo(() => {
    if (isApartmentMode) {
      return `${apartmentsHeadlineCount.toLocaleString('ru-RU')}+ квартир по России`;
    }
    if (filters.objectType === 'rooms') return 'Комнаты в регионе';
    if (filters.objectType === 'dachas') return 'Дачи в регионе';
    const nf = nonAptTotal;
    const k = LISTING_KIND_BY_OBJECT_TYPE[filters.objectType];
    const n = nf != null ? nf : kindCounts ? (kindCounts[k] ?? 0) : 0;
    if (filters.objectType === 'houses') {
      return n > 0 ? `${n.toLocaleString('ru-RU')} домов в регионе` : 'Дома в регионе';
    }
    if (filters.objectType === 'land') {
      return n > 0 ? `${n.toLocaleString('ru-RU')} участков в регионе` : 'Земельные участки';
    }
    return n > 0 ? `${n.toLocaleString('ru-RU')} коммерческих объектов` : 'Коммерческая недвижимость';
  }, [isApartmentMode, apartmentsHeadlineCount, filters.objectType, kindCounts, nonAptTotal]);

  const searchPlaceholder = useMemo(() => {
    if (isApartmentMode) return 'Метро, район, ЖК, улица, застройщик';
    if (filters.objectType === 'rooms') return 'Район, адрес, комната';
    if (filters.objectType === 'land') return 'Район, адрес, кадастровый номер';
    if (filters.objectType === 'dachas') return 'Район, адрес, дача';
    return 'Район, адрес, название объекта';
  }, [isApartmentMode, filters.objectType]);

  return (
    <section className="relative bg-background">
      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-5 sm:pt-6 sm:pb-5">
        <div className="flex flex-col items-center gap-1 mb-3">
          <RegionSelector
            regions={regionRows}
            selectedRegionId={regionId}
            onSelect={setStoredRegionId}
            className="w-full max-w-[720px]"
          />
          <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold leading-tight text-center">
            <span className="text-[#2563EB]">Live Grid.</span>{' '}
            <span className="text-foreground">{heroSubtitle}</span>
          </h1>
        </div>

        <div className="flex items-center sm:justify-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {OBJECT_TYPE_TABS.map((tab) => {
            const Icon = objectTabIcons[tab.type];
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => switchObjectType(tab.type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border shrink-0',
                  filters.objectType === tab.type
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border hover:bg-secondary hover:border-primary/30',
                )}
              >
                <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          ref={searchRef}
          className="w-full max-w-[1400px] mx-auto bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] px-5 sm:px-6 py-5 relative"
        >
          <div className="relative z-20">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 lg:h-[52px]">
              <div className="relative flex-1 lg:min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="w-full h-[52px] pl-9 pr-3 bg-transparent border-none outline-none text-[15px] placeholder:text-[#94a3b8]"
                  value={filters.search}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doSearch();
                  }}
                />
              </div>

              <div className="hidden lg:flex items-center">
                <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                {visibility.rooms && (
                  <>
                    <div ref={ptRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setPtOpen(!ptOpen)}
                        className={cn(
                          'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                          roomLabel !== 'Тип квартиры' ? 'text-primary font-medium' : 'text-foreground',
                        )}
                      >
                        {roomLabel === 'Тип квартиры' ? 'Тип' : roomLabel}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', ptOpen && 'rotate-180')} />
                      </button>
                      {ptOpen && (
                        <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[180px]">
                          {HERO_ROOM_TYPE_LABELS.map((t) => (
                            <li key={t}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    rooms: roomCategoriesFromHeroLabel(t),
                                  }));
                                  setPtOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                                  roomLabel === t && 'text-primary font-medium',
                                )}
                              >
                                {t}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                  </>
                )}
                <div className="flex items-center h-[52px]">
                  <input
                    type="text"
                    placeholder="Цена от"
                    className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none"
                    value={priceFromStr}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setPriceFromStr(v);
                      syncPriceToFilters(v, priceToStr);
                    }}
                  />
                  <span className="text-muted-foreground text-sm">—</span>
                  <input
                    type="text"
                    placeholder="до, ₽"
                    className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none"
                    value={priceToStr}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setPriceToStr(v);
                      syncPriceToFilters(priceFromStr, v);
                    }}
                  />
                </div>

                {visibility.deadline && (
                  <>
                    <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                    <div ref={dlRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setDlOpen(!dlOpen)}
                        className={cn(
                          'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                          deadlineLabel !== 'Срок сдачи' ? 'text-primary font-medium' : 'text-foreground',
                        )}
                      >
                        {deadlineLabel}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', dlOpen && 'rotate-180')} />
                      </button>
                      {dlOpen && (
                        <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[140px]">
                          {HERO_DEADLINE_LABELS.map((d) => (
                            <li key={d}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilters((prev) => ({
                                    ...prev,
                                    deadline: filtersFromHeroDeadline(d),
                                  }));
                                  setDlOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                                  deadlineLabel === d && 'text-primary font-medium',
                                )}
                              >
                                {d}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}

                {visibility.marketType && (
                  <>
                    <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                    <label className="sr-only" htmlFor="hero-apt-market">
                      Тип рынка
                    </label>
                    <select
                      id="hero-apt-market"
                      className={cn(
                        'h-9 max-w-[148px] lg:max-w-[160px] rounded-lg border border-[#e2e8f0] bg-white px-2 text-sm outline-none focus:border-primary/50',
                        filters.marketType !== 'all' ? 'font-medium text-primary' : 'text-foreground',
                      )}
                      value={filters.marketType}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          marketType: e.target.value as CatalogFilters['marketType'],
                        }))
                      }
                    >
                      <option value="all">Все</option>
                      <option value="new">Новостройки</option>
                      <option value="secondary">Вторичка</option>
                    </select>
                  </>
                )}

                <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
                <button
                  type="button"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Фильтры
                </button>
              </div>
            </div>

            {showHintsPanel && (
              <CatalogSearchHintsDropdown
                hints={catalogHints}
                isLoading={hintsLoading}
                className="absolute left-0 right-0 top-full mt-2"
                onPick={() => {
                  setSearchFocused(false);
                  setFilters((prev) => ({ ...prev, search: '' }));
                }}
              />
            )}
          </div>

          <div className="flex lg:hidden gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {visibility.rooms && (
              <button
                type="button"
                onClick={() => setPtOpen(!ptOpen)}
                className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {roomLabel === 'Тип квартиры' ? 'Тип' : roomLabel}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Фильтры
            </button>
          </div>

          {filtersOpen && (
            <div className="mt-3 pt-3 border-t border-[#e2e8f0] animate-in slide-in-from-top-1 duration-200 max-h-[min(70vh,520px)] overflow-y-auto">
              <FilterSidebar
                filters={filters}
                onChange={setFilters}
                totalCount={0}
                showMetro={isMoscow}
                showObjectTypeSwitcher={false}
                hasBlocks={isApartmentMode}
                districtOptions={districtsQuery.data}
                subwayOptions={subwaysQuery.data}
                builderOptions={buildersQuery.data}
                deadlineOptions={deadlinesQuery.data}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-3.5 gap-2">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="hidden sm:flex items-center gap-2 py-2.5 px-5 rounded-[10px] border border-[#cbd5e1] bg-white text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary" />
              На карте
            </button>
            <button
              type="button"
              onClick={doSearch}
              className="py-2.5 px-6 flex-1 sm:flex-none rounded-[10px] bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-[#1d4ed8] transition-colors shadow-sm"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
