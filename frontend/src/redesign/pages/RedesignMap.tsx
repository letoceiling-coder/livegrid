import { useState, useCallback, useRef, useEffect } from 'react';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import { defaultFilters, type CatalogFilters, type ResidentialComplex } from '@/redesign/data/types';
import { SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/hooks/useFilters';
import { useMapComplexes } from '@/hooks/useMapComplexes';

declare global { interface Window { ymaps: any; } }

const RedesignMap = () => {
  const [filters, setFilters]         = useState<CatalogFilters>({ ...defaultFilters });
  const [active, setActive]           = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapReady, setMapReady]       = useState(false);

  // mapDomRef  — the <div> the map renders into
  // mapInstance — the ymaps.Map object (passed to the hook)
  const mapDomRef     = useRef<HTMLDivElement>(null);
  const mapInstance   = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);

  const { data: filtersData } = useFilters();

  // ── Single data source ────────────────────────────────────────────────────
  const { complexes, total, loading } = useMapComplexes(mapInstance, filters, mapReady);

  // ── Load Yandex Maps SDK ──────────────────────────────────────────────────
  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(() => setMapReady(false) /* handled below */); return; }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd';
    s.async = true;
    s.onload = () => window.ymaps.ready(() => initMap());
    document.head.appendChild(s);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialise map once ───────────────────────────────────────────────────
  function initMap() {
    if (mapInstance.current || !mapDomRef.current) return;
    const map = new window.ymaps.Map(mapDomRef.current, {
      center: [55.751244, 37.618423],
      zoom: 11,
      controls: ['zoomControl', 'geolocationControl'],
    });
    mapInstance.current = map;
    setMapReady(true); // signals useMapComplexes to subscribe + fetch
  }

  // If ymaps was already loaded (page revisit without hard reload)
  useEffect(() => {
    if (window.ymaps?.Map) {
      window.ymaps.ready(() => initMap());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render markers whenever data changes ──────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !window.ymaps || !mapReady) return;
    const map = mapInstance.current;

    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    complexes.forEach((c: ResidentialComplex) => {
      if (!c.coords[0] && !c.coords[1]) return;
      const pm = new window.ymaps.Placemark(c.coords, {
        balloonContentHeader: `<strong>${c.name}</strong>`,
        balloonContentBody:   `<div>${c.district ? c.district + ' · ' : ''}от ${
          c.priceFrom ? c.priceFrom.toLocaleString('ru-RU') + ' ₽' : '—'
        }</div><a href="/complex/${c.slug}" style="color:hsl(206,89%,60%)">Подробнее →</a>`,
      }, { preset: 'islands#blueCircleDotIcon' });
      pm.events.add('click', () => setActive(c.slug));
      map.geoObjects.add(pm);
      markersRef.current.push(pm);
    });
  }, [complexes, mapReady]);

  // ── Filter handler — no refs needed ──────────────────────────────────────
  const handleFiltersChange = useCallback((f: CatalogFilters) => {
    setFilters(f);
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background pb-16 lg:pb-0">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Filters sidebar */}
        <aside className="hidden lg:block w-[280px] border-r border-border p-4 overflow-y-auto">
          <FilterSidebar
            filters={filters}
            onChange={handleFiltersChange}
            totalCount={total}
            filtersData={filtersData}
          />
        </aside>

        {/* Map */}
        <div className="flex-1 flex flex-col p-4 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              {total} объектов на карте
            </span>
            <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
          </div>
          <div
            ref={mapDomRef}
            className="flex-1 rounded-2xl overflow-hidden border min-h-[60vh]"
            style={{ background: '#e8e8e8' }}
          >
            {!mapReady && (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters */}
      {showFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button onClick={() => setShowFilters(false)} className="w-10 h-10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar
              filters={filters}
              onChange={handleFiltersChange}
              totalCount={total}
              filtersData={filtersData}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowFilters(false)}>
              Показать {total} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignMap;
