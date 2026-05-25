import { X } from 'lucide-react';
import type { CatalogFilters } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';

const ROOM_LABELS: Record<number, string> = {
  0: 'Студия',
  1: '1-комн.',
  2: '2-комн.',
  3: '3-комн.',
  4: '4+ комн.',
};

type Chip = { key: string; label: string };

function buildChips(filters: CatalogFilters): Chip[] {
  const chips: Chip[] = [];
  if (filters.search.trim()) {
    chips.push({ key: 'search', label: `Поиск: ${filters.search.trim()}` });
  }
  for (const r of filters.rooms) {
    chips.push({ key: `room-${r}`, label: ROOM_LABELS[r] ?? `${r} комн.` });
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    const from = filters.priceMin != null ? `${(filters.priceMin / 1_000_000).toFixed(1)}` : '0';
    const to = filters.priceMax != null ? `${(filters.priceMax / 1_000_000).toFixed(1)}` : '∞';
    chips.push({ key: 'price', label: `Цена ${from}–${to} млн ₽` });
  }
  if (filters.areaMin != null || filters.areaMax != null) {
    chips.push({
      key: 'area',
      label: `Площадь ${filters.areaMin ?? 0}–${filters.areaMax ?? '∞'} м²`,
    });
  }
  for (const d of filters.district) {
    chips.push({ key: `district-${d}`, label: d });
  }
  for (const s of filters.subway) {
    chips.push({ key: `subway-${s}`, label: `м. ${s}` });
  }
  for (const b of filters.builder) {
    chips.push({ key: `builder-${b}`, label: b });
  }
  if (filters.marketType === 'secondary') {
    chips.push({ key: 'market', label: 'Вторичка' });
  }
  if (filters.marketType === 'new') {
    chips.push({ key: 'market-new', label: 'Новостройки' });
  }
  for (const st of filters.status) {
    chips.push({ key: `status-${st}`, label: st });
  }
  if (filters.floorMin != null || filters.floorMax != null) {
    chips.push({
      key: 'floor',
      label: `Этаж ${filters.floorMin ?? 1}–${filters.floorMax ?? '∞'}`,
    });
  }
  for (const d of filters.deadline) {
    chips.push({ key: `deadline-${d}`, label: `Сдача ${d}` });
  }
  for (const p of filters.landPurpose) {
    chips.push({ key: `landPurpose-${p}`, label: p });
  }
  for (const t of filters.commercialTypes) {
    chips.push({ key: `commercialTypes-${t}`, label: t });
  }
  for (const m of filters.houseMaterials) {
    chips.push({ key: `houseMaterials-${m}`, label: m });
  }
  return chips;
}

function removeChip(filters: CatalogFilters, key: string): CatalogFilters {
  const next = { ...filters };
  if (key === 'search') next.search = '';
  else if (key === 'price') {
    next.priceMin = undefined;
    next.priceMax = undefined;
  } else if (key === 'area') {
    next.areaMin = undefined;
    next.areaMax = undefined;
  } else if (key === 'market') next.marketType = 'all';
  else if (key === 'market-new') next.marketType = 'all';
  else if (key.startsWith('room-')) {
    const r = Number(key.slice(5));
    next.rooms = next.rooms.filter((x) => x !== r);
  } else if (key.startsWith('district-')) {
    const name = key.slice(9);
    next.district = next.district.filter((x) => x !== name);
  } else if (key.startsWith('subway-')) {
    const name = key.slice(7);
    next.subway = next.subway.filter((x) => x !== name);
  } else if (key.startsWith('builder-')) {
    const name = key.slice(8);
    next.builder = next.builder.filter((x) => x !== name);
  } else if (key.startsWith('status-')) {
    const name = key.slice(7);
    next.status = next.status.filter((x) => x !== name);
  } else if (key === 'floor') {
    next.floorMin = undefined;
    next.floorMax = undefined;
  } else if (key.startsWith('deadline-')) {
    const name = key.slice(9);
    next.deadline = next.deadline.filter((x) => x !== name);
  } else if (key.startsWith('landPurpose-')) {
    const name = key.slice(12);
    next.landPurpose = next.landPurpose.filter((x) => x !== name);
  } else if (key.startsWith('commercialTypes-')) {
    const name = key.slice(16);
    next.commercialTypes = next.commercialTypes.filter((x) => x !== name);
  } else if (key.startsWith('houseMaterials-')) {
    const name = key.slice(15);
    next.houseMaterials = next.houseMaterials.filter((x) => x !== name);
  }
  return next;
}

type Props = {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  className?: string;
};

export default function CatalogActiveFilterChips({ filters, onChange, className }: Props) {
  const chips = buildChips(filters);
  if (!chips.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(removeChip(filters, chip.key))}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors min-h-[32px]"
        >
          {chip.label}
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...defaultFilters, objectType: filters.objectType })}
        className="text-xs text-primary hover:underline px-1 min-h-[32px]"
      >
        Сбросить всё
      </button>
    </div>
  );
}
