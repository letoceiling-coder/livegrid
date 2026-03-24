import { useState, useMemo, useCallback, useRef } from 'react';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import { defaultFilters, type CatalogFilters, type Viewport, type ResidentialComplex, type Complex } from '@/redesign/data/types';
import { SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/hooks/useFilters';
import { getApiUrl, defaultFetchOptions } from '@/shared/config/api';
import { mapMapComplexToModel, type ApiMapComplex } from '@/redesign/data/mappers';
import { useEffect, useRef as useRefAlias } from 'react';

declare global { interface Window { ymaps: any; } }

const DEFAULT_VIEWPORT: Viewport = { lat_min: 55.5, lat_max: 56.1, lng_min: 37.0, lng_max: 38.0 };

function adaptComplex(c: Complex): ResidentialComplex {
  return {
    id: c.id, slug: c.slug, name: c.name,
    description: c.description ?? '',
    builder: c.builder ?? '', district: c.district ?? '',
    subway: c.subway ?? '', subwayDistance: c.subway_distance ?? '',
    address: c.address ?? '', deadline: c.deadline ?? '',
    status: (c.status ?? 'building') as ResidentialComplex['status'],
    priceFrom: c.price_from ?? 0, priceTo: c.price_to ?? c.price_from ?? 0,
    images: c.images?.length ? c.images : ['/placeholder-complex.svg'],
    coords: [c.lat ?? 0, c.lng ?? 0],
    advantages: c.advantages ?? [], infrastructure: c.infrastructure ?? [],
    buildings: [],
  };
}

const RedesignMap = () => {
  const [filters, setFilters]     = useState<CatalogFilters>({ ...defaultFilters });
  const [active, setActive]       = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewport, setViewport]   = useState<Viewport>(DEFAULT_VIEWPORT);
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [loading, setLoading]     = useState(false);
  const mapRef                    = useRef<HTMLDivElement>(null);
  const mapInstance               = useRef<any>(null);
  const markersRef                = useRef<any[]>([]);
  const [ready, setReady]         = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout>>();

  const { data: filtersData } = useFilters();

  // Fetch map complexes
  const fetchComplexes = useCallback(async (vp: Viewport, f: CatalogFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        'bounds[north]': String(vp.lat_max),
        'bounds[south]': String(vp.lat_min),
        'bounds[east]':  String(vp.lng_max),
        'bounds[west]':  String(vp.lng_min),
      });
      if (f.search) params.set('search', f.search);
      f.district?.forEach(d => params.append('district[]', d));
      f.subway?.forEach(s => params.append('subway[]', s));
      f.builder?.forEach(b => params.append('builder[]', b));

      const res = await fetch(`${getApiUrl('map/complexes')}?${params}`, defaultFetchOptions);
      if (!res.ok) return;
      const json = await res.json();
      const items: Complex[] = (json.data as ApiMapComplex[]).map(mapMapComplexToModel);
      setComplexes(items.map(adaptComplex));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplexes(viewport, filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load Yandex Maps
  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(() => setReady(true)); return; }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd';
    s.async = true;
    s.onload = () => window.ymaps.ready(() => setReady(true));
    document.head.appendChild(s);
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    const map = new window.ymaps.Map(mapRef.current, {
      center: [55.751244, 37.618423], zoom: 11,
      controls: ['zoomControl', 'geolocationControl'],
    });
    mapInstance.current = map;

    const updateViewport = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        const newVp: Viewport = { lat_min: b[0][0], lat_max: b[1][0], lng_min: b[0][1], lng_max: b[1][1] };
        setViewport(newVp);
        fetchComplexes(newVp, filters);
      }, 300);
    };

    map.events.add('boundschange', updateViewport);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when complexes change or map becomes ready
  useEffect(() => {
    if (!mapInstance.current || !window.ymaps || !ready) return;
    const map = mapInstance.current;

    // Clear previous markers
    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    complexes.forEach(c => {
      if (!c.coords[0] && !c.coords[1]) return;
      const pm = new window.ymaps.Placemark(c.coords, {
        balloonContentHeader: `<strong>${c.name}</strong>`,
        balloonContentBody: `<div>${c.district ? c.district + ' · ' : ''}от ${c.priceFrom ? c.priceFrom.toLocaleString('ru-RU') + ' ₽' : '—'}</div><a href="/complex/${c.slug}" style="color:hsl(206,89%,60%)">Подробнее →</a>`,
      }, { preset: 'islands#blueCircleDotIcon' });
      pm.events.add('click', () => setActive(c.slug));
      map.geoObjects.add(pm);
      markersRef.current.push(pm);
    });
  }, [complexes, ready]);

  const handleFiltersChange = useCallback((f: CatalogFilters) => {
    setFilters(f);
    fetchComplexes(viewport, f);
  }, [viewport, fetchComplexes]);

  const totalCount = complexes.length;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Filters sidebar */}
        <aside className="hidden lg:block w-[280px] border-r border-border p-4 overflow-y-auto">
          <FilterSidebar
            filters={filters}
            onChange={handleFiltersChange}
            totalCount={totalCount}
            filtersData={filtersData}
          />
        </aside>

        {/* Map */}
        <div className="flex-1 flex flex-col p-4 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              {totalCount} объектов на карте
            </span>
            <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
          </div>
          <div
            ref={mapRef}
            className="flex-1 rounded-2xl overflow-hidden border min-h-[60vh]"
            style={{ background: '#e8e8e8' }}
          >
            {!ready && (
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
              totalCount={totalCount}
              filtersData={filtersData}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowFilters(false)}>
              Показать {totalCount} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignMap;
