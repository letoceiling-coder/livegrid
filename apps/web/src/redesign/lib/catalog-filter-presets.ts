import type { CatalogFilters } from '@/redesign/data/types';

export type CatalogFilterPreset = {
  id: string;
  label: string;
  /** Partial patch applied on top of current objectType. */
  patch: Partial<CatalogFilters>;
};

/** Fast discovery presets for apartments / new builds. */
export const CATALOG_FILTER_PRESETS: CatalogFilterPreset[] = [
  {
    id: 'studio-budget',
    label: 'Студии до 8 млн',
    patch: { rooms: [0], priceMax: 8_000_000, marketType: 'all' },
  },
  {
    id: '2room-mid',
    label: '2-к до 15 млн',
    patch: { rooms: [2], priceMax: 15_000_000 },
  },
  {
    id: '3room-family',
    label: '3-к от 60 м²',
    patch: { rooms: [3], areaMin: 60 },
  },
  {
    id: 'new-build',
    label: 'Новостройки',
    patch: { marketType: 'new', status: [] },
  },
  {
    id: 'ready',
    label: 'Сданные ЖК',
    patch: { marketType: 'new', status: ['completed'] },
  },
];

export function applyCatalogPreset(
  current: CatalogFilters,
  preset: CatalogFilterPreset,
): CatalogFilters {
  return {
    ...current,
    ...preset.patch,
    objectType: current.objectType,
    search: current.search,
  };
}
