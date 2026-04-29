import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Map, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ComplexCard from '@/redesign/components/ComplexCard';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import MapSearch from '@/redesign/components/MapSearch';
import { defaultFilters, type CatalogFilters, type Complex, type ResidentialComplex } from '@/redesign/data/types';
import { useBlocks } from '@/hooks/useBlocks';
import { useFilters } from '@/hooks/useFilters';
import { parseCatalogFiltersFromParams, urlTypeToSearchMode, type SearchMode } from '@/redesign/lib/searchQuery';

type ViewMode = 'grid' | 'list' | 'map';

// Adapter: Complex (API search) → ResidentialComplex (UI components)
// Note: buildings is intentionally empty — catalog uses pre-aggregated counts
function adaptComplex(c: Complex): ResidentialComplex {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    builder: c.builder ?? '',
    district: c.district ?? '',
    subway: c.subway ?? '',
    subwayDistance: c.subway_distance ?? '',
    address: c.address ?? '',
    deadline: c.deadline ?? '',
    status: (c.status ?? 'building') as ResidentialComplex['status'],
    priceFrom: c.price_from ?? 0,
    priceTo: c.price_to ?? c.price_from ?? 0,
    availableApartments: c.total_available_apartments ?? 0,
    images: c.images?.length ? c.images : ['/placeholder-complex.svg'],
    coords: [c.lat ?? 0, c.lng ?? 0],
    advantages: c.advantages ?? [],
    infrastructure: c.infrastructure ?? [],
    buildings: [],
  };
}

const catalogTitles: Record<SearchMode, string> = {
  apartment: 'Жилые комплексы',
  house: 'Дома',
  land: 'Участки',
  commercial: 'Коммерческая недвижимость',
};

function CatalogGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[480px]">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="h-80 rounded-xl bg-gradient-to-br from-muted/90 to-muted/35 animate-pulse border border-border/40"
          style={{ animationDelay: `${(i % 6) * 45}ms` }}
        />
      ))}
    </div>
  );
}

const RedesignCatalog = () => {
  const [searchParams] = useSearchParams();
  const initialParsed = useMemo(() => parseCatalogFiltersFromParams(searchParams), [searchParams]);
  const catalogMode = urlTypeToSearchMode(searchParams.get('type'));
  const blocksEnabled = catalogMode === 'apartment';

  const [view, setView]                     = useState<ViewMode>('grid');
  const [filters, setFilters]               = useState<CatalogFilters>({ ...defaultFilters, ...initialParsed });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapActive, setMapActive]           = useState<string | null>(null);
  const [page, setPage]                     = useState(1);

  // Reset page when filters change
  const handleFiltersChange = useCallback((f: CatalogFilters) => {
    setFilters(f);
    setPage(1);
  }, []);

  // Sync URL params -> filters
  useEffect(() => {
    const parsed = parseCatalogFiltersFromParams(searchParams);
    setFilters(prev => ({ ...prev, ...parsed }));
  }, [searchParams]);

  // Квартиры/ЖК: текущий API — только apartment; иначе список пустой (без «ложных» квартир)
  const { data, isLoading, isFetching } = useBlocks(filters, {
    page: view === 'map' ? 1 : page,
    perPage: view === 'map' ? 500 : 24,
    enabled: blocksEnabled,
  });

  const { data: filtersData } = useFilters();

  const complexes   = blocksEnabled ? (data?.complexes ?? []) : [];
  const meta        = blocksEnabled ? data?.meta : undefined;
  const totalPages  = meta?.lastPage ?? 1;
  const totalCount  = blocksEnabled ? (meta?.total ?? 0) : 0;

  // For map view — use all loaded complexes
  const allForMap = useMemo(() => complexes.map(adaptComplex), [complexes]);
  const adapted   = useMemo(() => complexes.map(adaptComplex), [complexes]);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background pb-16 lg:pb-0" style={{ scrollbarGutter: 'stable both-edges' }}>
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{catalogTitles[catalogMode]}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {blocksEnabled && isFetching && (
                <span className="inline-flex h-3 w-3 items-center justify-center" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/45 animate-pulse" />
                </span>
              )}
              {blocksEnabled
                ? `Найдено ${totalCount} объектов`
                : 'Данные для этого раздела появятся позже'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden h-9" onClick={() => setShowMobileFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
            <div className="hidden sm:flex items-center gap-0.5 border border-border rounded-xl p-1 bg-muted/50">
              {([['grid', LayoutGrid, 'Плитка'], ['list', List, 'Список'], ['map', Map, 'Карта']] as const).map(([mode, Icon, title]) => (
                <button
                  key={mode}
                  title={title}
                  onClick={() => setView(mode)}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200',
                    view === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar filters (desktop): self-start + sticky — колонка не «прыгает» при смене высоты контента */}
          {view !== 'map' && (
            <aside className="hidden lg:block w-[280px] shrink-0 self-start">
              <div className="sticky top-20 w-[280px]">
                <FilterSidebar
                  filters={filters}
                  onChange={handleFiltersChange}
                  totalCount={totalCount}
                  filtersData={filtersData}
                />
              </div>
            </aside>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 min-h-[620px]">
            {blocksEnabled && isLoading ? (
              <CatalogGridSkeleton />
            ) : (
              <>
                {view === 'grid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {adapted.map(c => <ComplexCard key={c.id} complex={c} />)}
                  </div>
                )}
                {view === 'list' && (
                  <div className="space-y-4">
                    {adapted.map(c => (
                      <ComplexCard key={c.id} complex={c} variant="list" />
                    ))}
                  </div>
                )}
                {view === 'map' && (
                  <MapSearch complexes={allForMap} activeSlug={mapActive} onSelect={setMapActive} />
                )}
                {adapted.length === 0 && (!blocksEnabled || !isLoading) && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <SlidersHorizontal className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">
                      {!blocksEnabled ? 'Раздел в подготовке' : 'Ничего не найдено'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {!blocksEnabled
                        ? 'Каталог квартир в ЖК доступен во вкладке «Квартиры».'
                        : 'Попробуйте изменить параметры фильтров'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-xl border text-sm hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      ← Назад
                    </button>
                    <span className="text-sm text-muted-foreground px-2">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-xl border text-sm hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button onClick={() => setShowMobileFilters(false)} className="w-10 h-10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar
              filters={filters}
              onChange={handleFiltersChange}
              totalCount={totalCount}
              filtersData={filtersData}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowMobileFilters(false)}>
              Показать {totalCount} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignCatalog;
