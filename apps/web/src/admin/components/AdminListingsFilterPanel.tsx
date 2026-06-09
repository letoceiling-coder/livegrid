import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ADMIN_ROOM_FILTER_OPTIONS,
  type AdminListingKind,
  type AdminListingsExtendedFilters,
  countActiveExtendedFilters,
  EMPTY_EXTENDED_FILTERS,
} from '@/admin/lib/admin-listings-filters';
import {
  COMMERCIAL_TYPE_FILTER_OPTIONS,
  LAND_PURPOSE_OPTIONS,
} from '@/redesign/lib/catalog-filter-config';

type DistrictRow = { id: number; name: string };
type RefRow = { id: number; name: string };
type BlockRow = { id: number; name: string };
type BuilderRow = { id: number; name: string };

type Props = {
  kind: AdminListingKind;
  regionId: number | 'all';
  filters: AdminListingsExtendedFilters;
  onChange: (next: AdminListingsExtendedFilters) => void;
  onPageReset: () => void;
};

export default function AdminListingsFilterPanel({
  kind,
  regionId,
  filters,
  onChange,
  onPageReset,
}: Props) {
  const [open, setOpen] = useState(() => countActiveExtendedFilters(filters) > 0);
  useEffect(() => {
    if (countActiveExtendedFilters(filters) > 0) setOpen(true);
  }, [filters]);
  const activeCount = countActiveExtendedFilters(filters);
  const regionSelected = regionId !== 'all';

  const patch = (partial: Partial<AdminListingsExtendedFilters>) => {
    onChange({ ...filters, ...partial });
    onPageReset();
  };

  const toggleRoom = (value: number) => {
    const next = filters.rooms.includes(value)
      ? filters.rooms.filter((r) => r !== value)
      : [...filters.rooms, value].sort((a, b) => a - b);
    patch({ rooms: next });
  };

  const isAptLike = kind === 'APARTMENT' || kind === 'ROOM';
  const districtsKind = kind === 'ROOM' ? 'APARTMENT' : kind;

  const { data: districts } = useQuery({
    queryKey: ['admin', 'listings-filters', 'districts', regionId, districtsKind],
    queryFn: () => apiGet<DistrictRow[]>(`/districts?region_id=${regionId}&kind=${districtsKind}`),
    enabled: regionSelected && (isAptLike || kind === 'HOUSE' || kind === 'LAND' || kind === 'COMMERCIAL'),
    staleTime: 60_000,
  });

  const { data: builders } = useQuery({
    queryKey: ['admin', 'listings-filters', 'builders', regionId],
    queryFn: () => apiGet<BuilderRow[]>(`/builders?region_id=${regionId}`),
    enabled: regionSelected && isAptLike,
    staleTime: 60_000,
  });

  const { data: blocksData } = useQuery({
    queryKey: ['admin', 'listings-filters', 'blocks', regionId],
    queryFn: () =>
      apiGet<{ data: BlockRow[] }>(
        `/blocks?region_id=${regionId}&per_page=200&page=1&sort=name_asc`,
      ),
    enabled: regionSelected && isAptLike,
    staleTime: 60_000,
  });

  const { data: finishings } = useQuery({
    queryKey: ['reference', 'finishings'],
    queryFn: () => apiGet<RefRow[]>('/reference/finishings'),
    enabled: isAptLike,
    staleTime: 60 * 60 * 1000,
  });

  const { data: buildingTypes } = useQuery({
    queryKey: ['reference', 'building-types'],
    queryFn: () => apiGet<RefRow[]>('/reference/building-types'),
    enabled: isAptLike,
    staleTime: 60 * 60 * 1000,
  });

  const blocks = blocksData?.data ?? [];
  const showRooms = isAptLike || kind === 'HOUSE';
  const showFloor = isAptLike || kind === 'COMMERCIAL' || kind === 'PARKING';
  const showMarket = isAptLike;
  const showBlock = isAptLike;
  const showBuilder = isAptLike;
  const showFinishing = isAptLike;
  const showBuildingType = isAptLike;
  const showDistrict = regionSelected && districts && districts.length > 0;

  return (
    <div className="w-full border rounded-xl bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium"
      >
        <span className="inline-flex items-center gap-2">
          Расширенные фильтры
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="border-t px-3 py-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            {showRooms ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">Комнатность</p>
                <div className="flex flex-wrap gap-1">
                  {ADMIN_ROOM_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleRoom(opt.value)}
                      className={cn(
                        'h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                        filters.rooms.includes(opt.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <FilterField label="Цена от, ₽">
              <Input
                value={filters.priceMin}
                onChange={(e) => patch({ priceMin: e.target.value })}
                className="h-9 w-[120px] text-xs"
                inputMode="numeric"
                placeholder="от"
              />
            </FilterField>
            <FilterField label="Цена до, ₽">
              <Input
                value={filters.priceMax}
                onChange={(e) => patch({ priceMax: e.target.value })}
                className="h-9 w-[120px] text-xs"
                inputMode="numeric"
                placeholder="до"
              />
            </FilterField>
            <FilterField label={kind === 'LAND' ? 'Площадь от, сот.' : 'Площадь от, м²'}>
              <Input
                value={filters.areaMin}
                onChange={(e) => patch({ areaMin: e.target.value })}
                className="h-9 w-[110px] text-xs"
                inputMode="decimal"
                placeholder="от"
              />
            </FilterField>
            <FilterField label={kind === 'LAND' ? 'Площадь до, сот.' : 'Площадь до, м²'}>
              <Input
                value={filters.areaMax}
                onChange={(e) => patch({ areaMax: e.target.value })}
                className="h-9 w-[110px] text-xs"
                inputMode="decimal"
                placeholder="до"
              />
            </FilterField>

            {showFloor ? (
              <>
                <FilterField label="Этаж от">
                  <Input
                    value={filters.floorMin}
                    onChange={(e) => patch({ floorMin: e.target.value })}
                    className="h-9 w-[90px] text-xs"
                    inputMode="numeric"
                    placeholder="от"
                  />
                </FilterField>
                <FilterField label="Этаж до">
                  <Input
                    value={filters.floorMax}
                    onChange={(e) => patch({ floorMax: e.target.value })}
                    className="h-9 w-[90px] text-xs"
                    inputMode="numeric"
                    placeholder="до"
                  />
                </FilterField>
              </>
            ) : null}

            <FilterField label="Публикация">
              <Select value={filters.published} onValueChange={(v) => patch({ published: v as AdminListingsExtendedFilters['published'] })}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="true">Опубликовано</SelectItem>
                  <SelectItem value="false">Снято</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            {showMarket ? (
              <FilterField label="Рынок">
                <Select value={filters.market} onValueChange={(v) => patch({ market: v as AdminListingsExtendedFilters['market'] })}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="new_building">Новостройки</SelectItem>
                    <SelectItem value="secondary">Вторичка</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showDistrict ? (
              <FilterField label="Район">
                <Select value={filters.districtKey} onValueChange={(v) => patch({ districtKey: v })}>
                  <SelectTrigger className="h-9 w-[180px] text-xs">
                    <SelectValue placeholder="Все районы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все районы</SelectItem>
                    {(districts ?? []).map((d) => {
                      const key = d.id > 0 ? `id:${d.id}` : `name:${d.name}`;
                      return (
                        <SelectItem key={key} value={key}>
                          {d.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showBlock && regionSelected ? (
              <FilterField label="ЖК">
                <Select
                  value={filters.blockId === 'all' ? 'all' : String(filters.blockId)}
                  onValueChange={(v) => patch({ blockId: v === 'all' ? 'all' : Number(v) })}
                >
                  <SelectTrigger className="h-9 w-[200px] text-xs">
                    <SelectValue placeholder="Все ЖК" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все ЖК</SelectItem>
                    {blocks.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showBuilder && regionSelected ? (
              <FilterField label="Застройщик">
                <Select
                  value={filters.builderId === 'all' ? 'all' : String(filters.builderId)}
                  onValueChange={(v) => patch({ builderId: v === 'all' ? 'all' : Number(v) })}
                >
                  <SelectTrigger className="h-9 w-[180px] text-xs">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все застройщики</SelectItem>
                    {(builders ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showFinishing ? (
              <FilterField label="Отделка">
                <Select
                  value={filters.finishingId === 'all' ? 'all' : String(filters.finishingId)}
                  onValueChange={(v) => patch({ finishingId: v === 'all' ? 'all' : Number(v) })}
                >
                  <SelectTrigger className="h-9 w-[160px] text-xs">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    {(finishings ?? []).map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {showBuildingType ? (
              <FilterField label="Тип дома">
                <Select
                  value={filters.buildingTypeId === 'all' ? 'all' : String(filters.buildingTypeId)}
                  onValueChange={(v) => patch({ buildingTypeId: v === 'all' ? 'all' : Number(v) })}
                >
                  <SelectTrigger className="h-9 w-[160px] text-xs">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    {(buildingTypes ?? []).map((bt) => (
                      <SelectItem key={bt.id} value={String(bt.id)}>
                        {bt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {kind === 'LAND' ? (
              <FilterField label="Категория земли">
                <Select value={filters.landCategory} onValueChange={(v) => patch({ landCategory: v })}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    {LAND_PURPOSE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {kind === 'COMMERCIAL' ? (
              <FilterField label="Тип коммерции">
                <Select value={filters.commercialType} onValueChange={(v) => patch({ commercialType: v })}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    {COMMERCIAL_TYPE_FILTER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            ) : null}

            {activeCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onChange({ ...EMPTY_EXTENDED_FILTERS });
                  onPageReset();
                }}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
                Сбросить
              </button>
            ) : null}
          </div>

          {!regionSelected && (showBlock || showBuilder || showDistrict) ? (
            <p className="text-[11px] text-muted-foreground">Выберите регион для фильтров по району, ЖК и застройщику.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
