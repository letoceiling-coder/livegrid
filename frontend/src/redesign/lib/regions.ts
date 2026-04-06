/**
 * Регионы каталога (id стабильны для API/query в будущем).
 * Дальше: автоопределение по IP, сохранение выбора в localStorage.
 */
export type RegionId = 'moscow';

export type RegionOption = { id: RegionId; name: string };

export const AVAILABLE_REGIONS: RegionOption[] = [{ id: 'moscow', name: 'Москва и МО' }];

export function regionLabel(id: RegionId): string {
  return AVAILABLE_REGIONS.find(r => r.id === id)?.name ?? AVAILABLE_REGIONS[0].name;
}
