import { cn } from '@/lib/utils';
import type { CatalogFilters } from '@/redesign/data/types';
import {
  applyCatalogPreset,
  CATALOG_FILTER_PRESETS,
  type CatalogFilterPreset,
} from '@/redesign/lib/catalog-filter-presets';

type Props = {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  className?: string;
  /** Hide new-build-only presets when region has no blocks. */
  showNewBuildPresets?: boolean;
};

function isPresetActive(filters: CatalogFilters, preset: CatalogFilterPreset): boolean {
  for (const [key, val] of Object.entries(preset.patch) as [keyof CatalogFilters, unknown][]) {
    const current = filters[key];
    if (Array.isArray(val) && Array.isArray(current)) {
      if (val.length !== current.length || val.some((v, i) => current[i] !== v)) return false;
    } else if (current !== val) {
      return false;
    }
  }
  return true;
}

export default function CatalogFilterPresets({
  filters,
  onChange,
  className,
  showNewBuildPresets = true,
}: Props) {
  if (filters.objectType !== 'apartments' && filters.objectType !== 'rooms') return null;

  const presets = CATALOG_FILTER_PRESETS.filter(
    (p) => showNewBuildPresets || !['new-build', 'ready'].includes(p.id),
  );

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none', className)}>
      {presets.map((preset) => {
        const active = isPresetActive(filters, preset);
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() =>
              onChange(active ? { ...filters, rooms: [], priceMax: undefined, priceMin: undefined, areaMin: undefined, marketType: 'all', status: [] } : applyCatalogPreset(filters, preset))
            }
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] touch-manipulation',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
