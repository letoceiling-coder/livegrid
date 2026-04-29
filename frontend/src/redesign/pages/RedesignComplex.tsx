import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ComplexHero from '@/redesign/components/ComplexHero';
import ApartmentTable from '@/redesign/components/ApartmentTable';
import Chessboard from '@/redesign/components/Chessboard';
import LayoutGrid from '@/redesign/components/LayoutGrid';
import { formatPrice } from '@/lib/formatPrice';
import type { SortField, SortDir } from '@/redesign/data/types';
import { useComplex } from '@/hooks/useComplex';

declare global {
  interface Window { ymaps: any; }
}

function resolveRoomCategory(a: { roomCategory: number | null; rooms: number; roomName?: string | null }): number {
  if (a.roomCategory !== null && a.roomCategory !== undefined) return a.roomCategory;
  if (a.rooms === 0) return 0;
  if (typeof a.roomName === 'string' && /студ/i.test(a.roomName)) return 0;
  return a.rooms;
}

const RedesignComplex = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: complex, isLoading, error } = useComplex(slug);
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'price', dir: 'asc' });
  const [roomFilter, setRoomFilter] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Derive buildings as a stable memoized array — guards against undefined at all call sites.
  // All downstream memos depend on this, NOT on the whole `complex` object.
  const buildings = useMemo(
    () => Array.isArray(complex?.buildings) ? complex!.buildings : [],
    [complex]
  );

  // Build unique room types grouped by room_category (0-4) for filter buttons.
  // Must be declared before any early returns to satisfy React's Rules of Hooks.
  const roomTypes = useMemo(() => {
    const map = new Map<number, string>();
    buildings.flatMap(b => Array.isArray(b.apartments) ? b.apartments : [])
      .filter((a: { status: string }) => a.status !== 'sold')
      .forEach((a: { roomCategory: number | null; rooms: number; roomName: string }) => {
        const cat = resolveRoomCategory(a);
        if (!map.has(cat)) {
          map.set(cat, a.roomName || (cat === 0 ? 'Студия' : `${cat}-комн.`));
        }
      });
    return [...map.entries()].sort((x, y) => x[0] - y[0]);
  }, [buildings]);

  const allApartments = useMemo(() => {
    let apts = buildings
      .flatMap(b => Array.isArray(b.apartments) ? b.apartments : [])
      .filter((a: { status: string }) => a.status !== 'sold');
    // Filter by room_category so "2Е-к.кв" matches when user selects "2-комн."
    if (roomFilter !== null) {
      apts = apts.filter((a: { roomCategory: number | null; rooms: number }) =>
        resolveRoomCategory(a) === roomFilter
      );
    }
    apts.sort((a: any, b: any) => {
      const m = sort.dir === 'asc' ? 1 : -1;
      const left = sort.field === 'rooms' ? resolveRoomCategory(a) : a[sort.field];
      const right = sort.field === 'rooms' ? resolveRoomCategory(b) : b[sort.field];
      return (left - right) * m;
    });
    return apts;
  }, [buildings, sort, roomFilter]);

  const layouts = useMemo(() => {
    if (!complex) return [];
    const groups: Record<number, {
      rooms: number; roomName: string; minArea: number; minPrice: number;
      planImage: string; count: number; apartmentId: string;
    }> = {};
    buildings
      .flatMap(b => Array.isArray(b.apartments) ? b.apartments : [])
      .filter((a: { status: string }) => a.status === 'available')
      .forEach((a: { id: string; roomCategory: number | null; rooms: number; roomName: string; area: number; price: number; planImage: string }) => {
        const cat = resolveRoomCategory(a);
        if (!groups[cat]) {
          groups[cat] = { rooms: cat, roomName: a.roomName, minArea: a.area, minPrice: a.price, planImage: a.planImage, count: 0, apartmentId: a.id };
        }
        groups[cat].count++;
        if (a.area < groups[cat].minArea) groups[cat].minArea = a.area;
        if (a.price < groups[cat].minPrice) {
          groups[cat].minPrice = a.price;
          groups[cat].planImage = a.planImage;
          groups[cat].apartmentId = a.id;
        }
      });
    return Object.values(groups).map((g, i) => ({
      id: String(i), complexId: complex.id,
      apartmentId: g.apartmentId,
      rooms: g.rooms, area: g.minArea, priceFrom: g.minPrice,
      planImage: g.planImage, availableCount: g.count,
    }));
  }, [complex, buildings]);

  const handleSort = (field: SortField) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  // Init map for map tab
  const initMap = () => {
    if (!complex || mapInstanceRef.current || !mapRef.current) return;
    if (!window.ymaps) {
      const s = document.createElement('script');
      s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd';
      s.async = true;
      s.onload = () => window.ymaps.ready(() => createMap());
      document.head.appendChild(s);
    } else {
      window.ymaps.ready(() => createMap());
    }
  };

  const createMap = () => {
    if (!complex || !mapRef.current || mapInstanceRef.current) return;
    const map = new window.ymaps.Map(mapRef.current, {
      center: complex.coords,
      zoom: 15,
      controls: ['zoomControl'],
    });
    const pm = new window.ymaps.Placemark(complex.coords, {
      balloonContentHeader: `<strong>${complex.name}</strong>`,
      balloonContentBody: `<div>${complex.address}</div>`,
    }, { preset: 'islands#blueCircleDotIcon' });
    map.geoObjects.add(pm);
    mapInstanceRef.current = map;
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-background animate-in fade-in duration-200">
        <div className="max-w-[1400px] mx-auto w-full px-4 py-6 space-y-6">
          <div className="h-10 w-40 rounded-lg bg-muted animate-pulse" />
          <div className="h-[220px] sm:h-[280px] rounded-2xl bg-muted/80 animate-pulse" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="h-24 rounded-xl bg-muted/70 animate-pulse" />
            <div className="h-24 rounded-xl bg-muted/70 animate-pulse" />
            <div className="h-24 rounded-xl bg-muted/70 animate-pulse" />
          </div>
          <div className="h-12 max-w-md rounded-lg bg-muted/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !complex) {
    return (
      <div className="flex flex-1 flex-col min-h-0 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">
            {(error as any)?.message === 'not_found' ? 'Комплекс не найден' : 'Ошибка загрузки данных'}
          </p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← Вернуться в каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background pb-16 lg:pb-0">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/catalog" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Каталог
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{complex.name}</span>
        </div>

        <ComplexHero complex={complex} />

        <Tabs defaultValue="apartments" className="mt-8" onValueChange={v => { if (v === 'map') setTimeout(initMap, 100); }}>
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">
            <TabsTrigger value="apartments" className="rounded-lg text-sm data-[state=active]:shadow-sm">
              Квартиры <span className="ml-1 text-xs text-muted-foreground">({allApartments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="layouts" className="rounded-lg text-sm data-[state=active]:shadow-sm">
              Планировки <span className="ml-1 text-xs text-muted-foreground">({layouts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="chess" className="rounded-lg text-sm data-[state=active]:shadow-sm">Шахматка</TabsTrigger>
            <TabsTrigger value="about" className="rounded-lg text-sm data-[state=active]:shadow-sm">О комплексе</TabsTrigger>
            <TabsTrigger value="infra" className="rounded-lg text-sm data-[state=active]:shadow-sm">Инфраструктура</TabsTrigger>
            <TabsTrigger value="map" className="rounded-lg text-sm data-[state=active]:shadow-sm">Карта</TabsTrigger>
          </TabsList>

          {/* Apartments */}
          <TabsContent value="apartments" className="mt-6">
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setRoomFilter(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${roomFilter === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 bg-background'}`}
              >
                Все
              </button>
              {roomTypes.map(([r, label]) => (
                <button
                  key={r}
                  onClick={() => setRoomFilter(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${roomFilter === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 bg-background'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ApartmentTable apartments={allApartments} sort={sort} onSort={handleSort} />
          </TabsContent>

          {/* Layouts */}
          <TabsContent value="layouts" className="mt-6">
            {layouts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Нет доступных планировок</p>
            ) : (
              <LayoutGrid layouts={layouts.filter(l => l.availableCount > 0)} complexSlug={complex.slug} />
            )}
          </TabsContent>

          {/* Chessboard */}
          <TabsContent value="chess" className="mt-6 space-y-8">
            {buildings.map(b => (
              <Chessboard key={b.id} apartments={Array.isArray(b.apartments) ? b.apartments : []} floors={b.floors} sections={b.sections} buildingName={b.name} />
            ))}
          </TabsContent>

          {/* About */}
          <TabsContent value="about" className="mt-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h3 className="font-semibold text-lg">О комплексе</h3>
              {complex.description ? (
                <div
                  className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_p]:mb-3 [&_ul]:pl-4 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: complex.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Описание не добавлено</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pt-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Адрес</p>
                  <p className="text-sm font-medium">{complex.address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Застройщик</p>
                  <p className="text-sm font-medium">{complex.builder}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Район</p>
                  <p className="text-sm font-medium">{complex.district}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Метро</p>
                  <p className="text-sm font-medium">{complex.subway} ({complex.subwayDistance})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Срок сдачи</p>
                  <p className="text-sm font-medium">{complex.deadline}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Корпусов</p>
                  <p className="text-sm font-medium">{buildings.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Цена</p>
                  <p className="text-sm font-medium">{formatPrice(complex.priceFrom)} — {formatPrice(complex.priceTo)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Infrastructure */}
          <TabsContent value="infra" className="mt-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold text-lg mb-5">Инфраструктура</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {complex.infrastructure.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Map */}
          <TabsContent value="map" className="mt-6">
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{complex.address}</span>
                <span className="text-xs text-muted-foreground">· м. {complex.subway} · {complex.subwayDistance}</span>
              </div>
              <div ref={mapRef} className="h-[400px] bg-muted" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RedesignComplex;
