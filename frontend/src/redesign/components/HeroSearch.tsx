import { Fragment, useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { useSearchCount } from '@/api/hooks/useSearchCount';
import RegionModal from '@/redesign/components/RegionModal';
import { AVAILABLE_REGIONS, regionLabel, type RegionId } from '@/redesign/lib/regions';
import {
  type SearchMode,
  type HeroFilters,
  type HeroFilterKey,
  filterConfig,
  buildQuery,
  defaultHeroFilters,
} from '@/redesign/lib/searchQuery';

const objectTabs: { label: string; icon: typeof Building2; value: SearchMode }[] = [
  { label: 'Квартиры', icon: Building2, value: 'apartment' },
  { label: 'Дома', icon: Home, value: 'house' },
  { label: 'Участки', icon: TreePine, value: 'land' },
  { label: 'Коммерция', icon: Store, value: 'commercial' },
];

const propertyTypes = ['Тип квартиры', 'Студия', '1-комнатная', '2-комнатная', '3-комнатная', '4+ комнат'];
const deadlines = ['Срок сдачи', 'Сдан', '2026', '2027', '2028', '2029+'];
const commercialTypes = ['Тип объекта', 'Офис', 'Торговое', 'Склад', 'Производство'];

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

export default function HeroSearch() {
  const [mode, setMode] = useState<SearchMode>('apartment');
  const [filters, setFilters] = useState<HeroFilters>(defaultHeroFilters);

  const [staticSuggest, setStaticSuggest] = useState<Suggestion[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [region, setRegion] = useState<RegionId>('moscow');
  const [roomOpen, setRoomOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [commercialOpen, setCommercialOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regionModalOpen, setRegionModalOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const ptRef = useRef<HTMLDivElement>(null);
  const dlRef = useRef<HTMLDivElement>(null);
  const commercialRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const apiSuggest = useSuggest(filters.search) as SuggestItem[];

  const roomLabel = filters.roomType === null ? 'Тип квартиры' : filters.roomType;
  const deadlineLabel = filters.completion === null ? 'Срок сдачи' : filters.completion;
  const commercialLabel =
    filters.commercialType === null ? 'Тип объекта' : filters.commercialType;
  const priceFromVal = filters.priceFrom ?? '';
  const priceToVal = filters.priceTo ?? '';
  const areaFromVal = filters.areaFrom ?? '';
  const areaToVal = filters.areaTo ?? '';
  const floorsFromVal = filters.floorsFrom ?? '';
  const floorsToVal = filters.floorsTo ?? '';

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
    const qs = buildQuery({ mode, filters, searchOverride }).toString();
    navigate(`/catalog?${qs}`);
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
      const qs = buildQuery({
        mode,
        filters: { ...filters, search: item.name },
        searchOverride: item.name,
      }).toString();
      navigate(`/catalog?${qs}`);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(t)) setSearchFocused(false);
      if (ptRef.current && !ptRef.current.contains(t)) setRoomOpen(false);
      if (dlRef.current && !dlRef.current.contains(t)) setDlOpen(false);
      if (commercialRef.current && !commercialRef.current.contains(t)) setCommercialOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasAutocomplete =
    searchFocused &&
    (staticSuggest.length > 0 || apiMetroDistrict.length > 0 || apiComplexes.length > 0);

  const { data: count, error: countError } = useSearchCount(filters, mode);

  const ctaLabel =
    mode === 'apartment' && count != null && !countError
      ? `Показать ${count.apartments.toLocaleString('ru-RU')} квартир в ${count.complexes.toLocaleString('ru-RU')} ЖК →`
      : 'Показать результаты →';

  const dropdownClass =
    'absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-[100] min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150';

  const renderDesktopFilter = (key: HeroFilterKey) => {
    switch (key) {
      case 'rooms':
        return (
          <div ref={ptRef} className="relative">
            <button
              type="button"
              onClick={() => setRoomOpen(!roomOpen)}
              className={cn(
                'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                filters.roomType !== null ? 'text-primary font-medium' : 'text-foreground',
              )}
            >
              {roomLabel === 'Тип квартиры' ? 'Тип' : roomLabel}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', roomOpen && 'rotate-180')} />
            </button>
            {roomOpen && (
              <ul className={dropdownClass}>
                {propertyTypes.map(t => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(f => ({
                          ...f,
                          roomType: t === 'Тип квартиры' ? null : t,
                        }));
                        setRoomOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                        (t === 'Тип квартиры' ? filters.roomType === null : filters.roomType === t) &&
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
        );
      case 'price':
        return (
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
        );
      case 'metro':
        return null;
      case 'completion':
        return (
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
              <ul className={cn(dropdownClass, 'min-w-[140px]')}>
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
        );
      case 'area':
        return (
          <div className="flex items-center h-[52px]">
            <input
              type="text"
              placeholder="Пл. от"
              className="w-[88px] h-full px-2 text-sm bg-transparent outline-none border-none"
              value={areaFromVal}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  areaFrom: e.target.value.replace(/\D/g, '') || null,
                }))
              }
            />
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="text"
              placeholder="до м²"
              className="w-[88px] h-full px-2 text-sm bg-transparent outline-none border-none"
              value={areaToVal}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  areaTo: e.target.value.replace(/\D/g, '') || null,
                }))
              }
            />
          </div>
        );
      case 'floors':
        return (
          <div className="flex items-center h-[52px]">
            <input
              type="text"
              placeholder="Эт. от"
              className="w-[72px] h-full px-2 text-sm bg-transparent outline-none border-none"
              value={floorsFromVal}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  floorsFrom: e.target.value.replace(/\D/g, '') || null,
                }))
              }
            />
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="text"
              placeholder="до"
              className="w-[72px] h-full px-2 text-sm bg-transparent outline-none border-none"
              value={floorsToVal}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  floorsTo: e.target.value.replace(/\D/g, '') || null,
                }))
              }
            />
          </div>
        );
      case 'type':
        return (
          <div ref={commercialRef} className="relative">
            <button
              type="button"
              onClick={() => setCommercialOpen(!commercialOpen)}
              className={cn(
                'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                filters.commercialType !== null ? 'text-primary font-medium' : 'text-foreground',
              )}
            >
              {commercialLabel === 'Тип объекта' ? 'Тип' : commercialLabel}
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', commercialOpen && 'rotate-180')} />
            </button>
            {commercialOpen && (
              <ul className={dropdownClass}>
                {commercialTypes.map(t => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(f => ({
                          ...f,
                          commercialType: t === 'Тип объекта' ? null : t,
                        }));
                        setCommercialOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors',
                        (t === 'Тип объекта'
                          ? filters.commercialType === null
                          : filters.commercialType === t) && 'text-primary font-medium',
                      )}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const mobileSuggestOpen = roomOpen || dlOpen || commercialOpen;

  return (
    <section className="relative bg-background overflow-x-hidden min-w-0">
      <div className="max-w-[1400px] mx-auto min-w-0 pt-4 pb-5 sm:pt-6 sm:pb-5">
        <div className="max-w-full overflow-x-hidden px-4">
          <div className="flex flex-col items-center gap-1 mb-3">
            <div className="relative z-[30] flex w-full max-w-full justify-center">
              <button
              type="button"
              onClick={() => setRegionModalOpen(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                regionModalOpen
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/40',
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{regionLabel(region)}</span>
              <ChevronDown
                className={cn('w-3 h-3 shrink-0 transition-transform duration-200', regionModalOpen && 'rotate-180')}
              />
              </button>
            </div>

          <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold leading-tight text-center max-w-full break-words px-0.5">
            <span className="text-[#2563EB]">Live Grid.</span>{' '}
            <span className="hidden sm:inline text-foreground">62 000+ квартир по России</span>
            <span className="sm:hidden text-foreground">62 000+ квартир</span>
          </h1>
        </div>

        <div className="flex justify-start sm:justify-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide w-full min-w-0 px-4 mb-4">
          {objectTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMode(tab.value)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 border',
                  mode === tab.value
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
        </div>

        <RegionModal
          open={regionModalOpen}
          onOpenChange={setRegionModalOpen}
          regions={AVAILABLE_REGIONS}
          selectedId={region}
          onSelect={setRegion}
        />

        <div className="w-full max-w-[900px] mx-auto min-w-0 px-4">
        <div className="w-full min-w-0 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] px-4 py-5 overflow-visible relative z-20">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 lg:h-[52px] overflow-visible min-w-0">
            <div ref={searchRef} className="relative flex-1 min-w-0 z-[25]">
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-[100] max-h-[300px] sm:max-h-[360px] overflow-y-auto animate-in fade-in-0 slide-in-from-top-1 duration-150">
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

            <div className="hidden lg:flex items-center overflow-visible">
              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              {filterConfig[mode]
                .filter(k => k !== 'metro')
                .map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 && <div className="w-px h-6 bg-[#e2e8f0] mx-2" />}
                    {renderDesktopFilter(key)}
                  </Fragment>
                ))}
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

          <div className="flex lg:hidden flex-wrap gap-2 w-full mt-2 overflow-y-visible">
            {mode === 'apartment' && (
              <button
                type="button"
                onClick={() => setRoomOpen(!roomOpen)}
                className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1"
              >
                {roomLabel === 'Тип квартиры' ? 'Тип' : roomLabel}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
            {(mode === 'apartment' || mode === 'house' || mode === 'land' || mode === 'commercial') && (
              <button
                type="button"
                className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px]"
              >
                Цена
              </button>
            )}
            {mode === 'apartment' && (
              <button
                type="button"
                onClick={() => setDlOpen(!dlOpen)}
                className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1"
              >
                {deadlineLabel}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
            {(mode === 'house' || mode === 'land' || mode === 'commercial') && (
              <button type="button" className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px]">
                Площадь
              </button>
            )}
            {mode === 'house' && (
              <button type="button" className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px]">
                Этажи
              </button>
            )}
            {mode === 'commercial' && (
              <button
                type="button"
                onClick={() => setCommercialOpen(!commercialOpen)}
                className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1"
              >
                {commercialLabel === 'Тип объекта' ? 'Тип' : commercialLabel}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Ещё
            </button>
          </div>

          {mobileSuggestOpen && (
            <div className="lg:hidden relative z-[100] mt-1 border border-border rounded-xl bg-card shadow-lg max-h-[240px] overflow-y-auto">
              {roomOpen &&
                mode === 'apartment' &&
                propertyTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50"
                    onClick={() => {
                      setFilters(f => ({ ...f, roomType: t === 'Тип квартиры' ? null : t }));
                      setRoomOpen(false);
                    }}
                  >
                    {t}
                  </button>
                ))}
              {dlOpen &&
                mode === 'apartment' &&
                deadlines.map(d => (
                  <button
                    key={d}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50"
                    onClick={() => {
                      setFilters(f => ({ ...f, completion: d === 'Срок сдачи' ? null : d }));
                      setDlOpen(false);
                    }}
                  >
                    {d}
                  </button>
                ))}
              {commercialOpen &&
                mode === 'commercial' &&
                commercialTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50"
                    onClick={() => {
                      setFilters(f => ({ ...f, commercialType: t === 'Тип объекта' ? null : t }));
                      setCommercialOpen(false);
                    }}
                  >
                    {t}
                  </button>
                ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3.5 gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="hidden sm:flex items-center gap-2 py-2.5 px-4 rounded-[10px] border border-[#cbd5e1] bg-white text-sm font-medium hover:bg-muted/30 transition-colors shrink-0"
            >
              <MapPin className="w-4 h-4 text-primary" />
              На карте
            </button>
            <Button
              type="button"
              onClick={doSearch}
              className="py-2.5 px-4 flex-1 sm:flex-none min-w-0 rounded-[10px] bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-[#1d4ed8] transition-colors shadow-sm h-auto"
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
