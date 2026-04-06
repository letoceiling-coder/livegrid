import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  Home,
  TreePine,
  Store,
  Train,
  MapPinned,
  Landmark,
  Route,
  HardHat,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSuggest } from '@/api/hooks/useSuggest';

const objectTabs = [
  { label: 'Квартиры', icon: Building2, value: 'apartments' },
  { label: 'Дома', icon: Home, value: 'houses' },
  { label: 'Участки', icon: TreePine, value: 'land' },
  { label: 'Коммерция', icon: Store, value: 'commercial' },
];

const regions = [
  'Москва и МО',
  'Санкт-Петербург и ЛО',
  'Краснодарский край',
  'Московская область',
  'Ленинградская область',
  'Татарстан',
  'Крым',
  'Сочи',
  'Другой регион',
];

const propertyTypes = ['Тип квартиры', 'Студия', '1-комнатная', '2-комнатная', '3-комнатная', '4+ комнат'];
const deadlines = ['Срок сдачи', 'Сдан', '2026', '2027', '2028', '2029+'];

type Suggestion = { label: string; type: 'metro' | 'district' | 'complex' | 'street' | 'builder' | 'bank'; icon: typeof Train };
const staticSuggestions: Suggestion[] = [
  { label: 'Сокольники', type: 'metro', icon: Train },
  { label: 'Тверская', type: 'metro', icon: Train },
  { label: 'Парк Культуры', type: 'metro', icon: Train },
  { label: 'Хамовники', type: 'district', icon: MapPinned },
  { label: 'Пресненский', type: 'district', icon: MapPinned },
  { label: 'Басманный', type: 'district', icon: MapPinned },
  { label: 'ул. Ленина', type: 'street', icon: Route },
  { label: 'ул. Профсоюзная', type: 'street', icon: Route },
  { label: 'ПИК', type: 'builder', icon: HardHat },
  { label: 'Самолёт', type: 'builder', icon: HardHat },
  { label: 'Донстрой', type: 'builder', icon: HardHat },
  { label: 'Сбербанк', type: 'bank', icon: Banknote },
  { label: 'ВТБ', type: 'bank', icon: Banknote },
];

const typeLabels: Record<string, string> = {
  metro: 'Метро',
  district: 'Район',
  complex: 'ЖК',
  street: 'Улица',
  builder: 'Застройщик',
  bank: 'Банк',
};

function filterStaticSuggestions(q: string): Suggestion[] {
  if (q.length < 2) return [];
  const lower = q.toLowerCase();
  return staticSuggestions.filter(s => s.label.toLowerCase().includes(lower)).slice(0, 6);
}

type SuggestItem =
  | { type: 'complex'; id: string; slug: string; name: string; district: string; subway: string; image: string }
  | { type: 'metro'; id: string | number; name: string }
  | { type: 'district'; id: string | number; name: string };

type HeroSearchProps = {
  /** Подставить в CTA вместо захардкоженных чисел из шаблона */
  statsApartments?: number;
  statsComplexes?: number;
};

export default function HeroSearch({ statsApartments, statsComplexes }: HeroSearchProps) {
  const [activeTab, setActiveTab] = useState('apartments');
  const [filters, setFilters] = useState<{
    type: string | null;
    priceFrom: string | null;
    priceTo: string | null;
    completion: string | null;
    search: string;
  }>({
    type: null,
    priceFrom: null,
    priceTo: null,
    completion: null,
    search: '',
  });

  const [staticSuggest, setStaticSuggest] = useState<Suggestion[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('Москва и МО');
  const [regionOpen, setRegionOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const ptRef = useRef<HTMLDivElement>(null);
  const dlRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const apiSuggest = useSuggest(filters.search) as SuggestItem[];

  const propertyTypeLabel = filters.type === null ? 'Тип квартиры' : filters.type;
  const deadlineLabel = filters.completion === null ? 'Срок сдачи' : filters.completion;
  const priceFromVal = filters.priceFrom ?? '';
  const priceToVal = filters.priceTo ?? '';

  const apiComplexes = useMemo(
    () => apiSuggest.filter((x): x is Extract<SuggestItem, { type: 'complex' }> => x.type === 'complex'),
    [apiSuggest],
  );

  const apiMetroDistrict = useMemo(
    () => apiSuggest.filter(x => x.type === 'metro' || x.type === 'district'),
    [apiSuggest],
  );

  const handleSearch = useCallback((val: string) => {
    setFilters(f => ({ ...f, search: val }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStaticSuggest(filterStaticSuggestions(val));
    }, 200);
  }, []);

  const navigateToCatalog = (searchOverride?: string) => {
    const q = searchOverride ?? filters.search;
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (activeTab !== 'apartments') params.set('type', activeTab);
    else params.set('type', 'apartments');

    if (filters.type) params.set('rooms', filters.type);
    if (filters.completion) params.set('deadline', filters.completion);
    if (filters.priceFrom) params.set('priceFrom', filters.priceFrom);
    if (filters.priceTo) params.set('priceTo', filters.priceTo);
    navigate(`/catalog?${params.toString()}`);
  };

  const doSearch = () => navigateToCatalog();

  const pickApiItem = (item: SuggestItem) => {
    setSearchFocused(false);
    setFilters(f => ({ ...f, search: '' }));
    setStaticSuggest([]);
    if (item.type === 'complex') {
      if (!item.slug) return;
      navigate(`/complex/${item.slug}`);
      return;
    }
    if (item.type === 'metro' || item.type === 'district') {
      navigate(`/catalog?search=${encodeURIComponent(item.name)}`);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setRegionOpen(false);
      if (ptRef.current && !ptRef.current.contains(e.target as Node)) setPtOpen(false);
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasAutocomplete =
    searchFocused &&
    (staticSuggest.length > 0 || apiMetroDistrict.length > 0 || apiComplexes.length > 0);

  const ctaLabel =
    statsApartments != null && statsComplexes != null
      ? `Показать ${statsApartments.toLocaleString('ru-RU')} квартир в ${statsComplexes.toLocaleString('ru-RU')} ЖК →`
      : 'Показать 58 728 квартир в 370 ЖК →';

  return (
    <section className="relative bg-background">
      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-5 sm:pt-6 sm:pb-5">
        <div className="flex flex-col items-center gap-1 mb-3">
          <div className="relative w-fit" ref={regionRef}>
            <button
              type="button"
              onClick={() => setRegionOpen(!regionOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                regionOpen
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/40',
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{selectedRegion}</span>
              <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform duration-200', regionOpen && 'rotate-180')} />
            </button>
            {regionOpen && (
              <ul className="absolute top-full left-0 mt-1.5 py-1.5 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[220px] max-h-[300px] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
                {regions.map(r => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRegion(r);
                        setRegionOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2',
                        selectedRegion === r && 'text-primary font-medium',
                      )}
                    >
                      {selectedRegion === r && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold leading-tight text-center">
            <span className="text-[#2563EB]">Live Grid.</span>{' '}
            <span className="hidden sm:inline text-foreground">62 000+ квартир по России</span>
            <span className="sm:hidden text-foreground">62 000+ квартир</span>
          </h1>
        </div>

        <div className="flex items-center sm:justify-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {objectTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  navigate(`/catalog?type=${tab.value}`);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border shrink-0',
                  activeTab === tab.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background border-border hover:bg-secondary hover:border-primary/30',
                )}
              >
                <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                {tab.label}
              </button>
            );
          })}
          <div className="w-px h-6 bg-border shrink-0 mx-0.5 hidden sm:block" />
          <button
            type="button"
            onClick={() => navigate('/belgorod')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 bg-[#F97316] text-white hover:bg-[#EA580C] shadow-sm"
          >
            🏙 Белгород
          </button>
        </div>

        <div className="w-full max-w-[900px] mx-auto bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] px-5 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 lg:h-[52px]">
            <div ref={searchRef} className="relative flex-1 lg:min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Метро, район, ЖК, улица, застройщик"
                className="w-full h-[52px] pl-9 pr-3 bg-transparent border-none outline-none text-[15px] placeholder:text-[#94a3b8]"
                value={filters.search}
                onFocus={() => setSearchFocused(true)}
                onChange={e => handleSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') doSearch();
                }}
                autoComplete="off"
              />
              {hasAutocomplete && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-[300px] sm:max-h-[360px] overflow-y-auto animate-in fade-in-0 slide-in-from-top-1 duration-150">
                  {staticSuggest.length > 0 && (
                    <div className="py-1">
                      {staticSuggest.map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <button
                            key={`${s.type}-${i}`}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setFilters(f => ({ ...f, search: s.label }));
                              setSearchFocused(false);
                              navigateToCatalog(s.label);
                            }}
                            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                          >
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm">{s.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">
                              {typeLabels[s.type]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {apiMetroDistrict.length > 0 && (
                    <>
                      {staticSuggest.length > 0 && <div className="h-px bg-border" />}
                      <div className="py-1">
                        {apiMetroDistrict.map((item, i) => (
                          <button
                            key={`api-${item.type}-${item.id}-${i}`}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => pickApiItem(item)}
                            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                          >
                            {item.type === 'metro' ? (
                              <Train className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <MapPinned className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm">{item.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">
                              {item.type === 'metro' ? 'Метро' : 'Район'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {apiComplexes.length > 0 && (
                    <>
                      {(staticSuggest.length > 0 || apiMetroDistrict.length > 0) && <div className="h-px bg-border" />}
                      <div className="py-1">
                        <p className="px-3 sm:px-4 py-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                          Жилые комплексы
                        </p>
                        {apiComplexes.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => pickApiItem(c)}
                            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                          >
                            <img
                              src={c.image || '/placeholder-complex.svg'}
                              alt=""
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0 text-left">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.district}
                                {c.subway ? ` · м. ${c.subway}` : ''}
                              </p>
                            </div>
                            <Landmark className="w-4 h-4 text-muted-foreground shrink-0 ml-auto hidden sm:block" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="hidden lg:flex items-center">
              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              <div ref={ptRef} className="relative">
                <button
                  type="button"
                  onClick={() => setPtOpen(!ptOpen)}
                  className={cn(
                    'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                    filters.type !== null ? 'text-primary font-medium' : 'text-foreground',
                  )}
                >
                  {propertyTypeLabel === 'Тип квартиры' ? 'Тип' : propertyTypeLabel}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', ptOpen && 'rotate-180')} />
                </button>
                {ptOpen && (
                  <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150">
                    {propertyTypes.map(t => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters(f => ({
                              ...f,
                              type: t === 'Тип квартиры' ? null : t,
                            }));
                            setPtOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                            (t === 'Тип квартиры' ? filters.type === null : filters.type === t) &&
                              'text-primary font-medium',
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
              <div className="flex items-center h-[52px]">
                <input
                  type="text"
                  placeholder="Цена от"
                  className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none"
                  value={priceFromVal}
                  onChange={e =>
                    setFilters(f => ({
                      ...f,
                      priceFrom: e.target.value.replace(/\D/g, '') || null,
                    }))
                  }
                />
                <span className="text-muted-foreground text-sm">—</span>
                <input
                  type="text"
                  placeholder="до, ₽"
                  className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none"
                  value={priceToVal}
                  onChange={e =>
                    setFilters(f => ({
                      ...f,
                      priceTo: e.target.value.replace(/\D/g, '') || null,
                    }))
                  }
                />
              </div>

              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              <div ref={dlRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDlOpen(!dlOpen)}
                  className={cn(
                    'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                    filters.completion !== null ? 'text-primary font-medium' : 'text-foreground',
                  )}
                >
                  {deadlineLabel}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', dlOpen && 'rotate-180')} />
                </button>
                {dlOpen && (
                  <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-150">
                    {deadlines.map(d => (
                      <li key={d}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters(f => ({
                              ...f,
                              completion: d === 'Срок сдачи' ? null : d,
                            }));
                            setDlOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                            (d === 'Срок сдачи' ? filters.completion === null : filters.completion === d) &&
                              'text-primary font-medium',
                          )}
                        >
                          {d}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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

          <div className="flex lg:hidden gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setPtOpen(!ptOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {propertyTypeLabel === 'Тип квартиры' ? 'Тип' : propertyTypeLabel}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] whitespace-nowrap shrink-0"
            >
              Цена
            </button>
            <button
              type="button"
              onClick={() => setDlOpen(!dlOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {deadlineLabel}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Ещё
            </button>
          </div>

          <div className="flex items-center justify-between mt-3.5 gap-2">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="hidden sm:flex items-center gap-2 py-2.5 px-5 rounded-[10px] border border-[#cbd5e1] bg-white text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary" />
              На карте
            </button>
            <Button
              type="button"
              onClick={doSearch}
              className="py-2.5 px-6 flex-1 sm:flex-none rounded-[10px] bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-[#1d4ed8] transition-colors shadow-sm h-auto"
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
