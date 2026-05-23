import type { Apartment } from '@/redesign/data/types';

export type SectionBoard = {
  section: number;
  floors: number[];
  columns: Array<Array<Apartment | null>>;
  availableCount: number;
  totalCount: number;
};

export function apartmentNumber(apt: Apartment): number {
  const n = Number(apt.number ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function sectionNumbersFrom(apartments: Apartment[], sections: number): number[] {
  const fromApts = apartments
    .map((a) => Number(a.section ?? 1))
    .filter((n) => Number.isFinite(n) && n > 0);
  const fromCount = Array.from({ length: Math.max(sections, 1) }, (_, i) => i + 1);
  return Array.from(new Set([...fromCount, ...fromApts])).sort((a, b) => a - b);
}

export function buildSectionBoards(
  apartments: Apartment[],
  floors: number,
  sectionNumbers: number[],
): SectionBoard[] {
  const bySection = new Map<number, Map<number, Apartment[]>>();
  for (const a of apartments) {
    const floor = a.floor || 1;
    const section = Number(a.section ?? 1) || 1;
    const byFloor = bySection.get(section) ?? new Map<number, Apartment[]>();
    const arr = byFloor.get(floor) ?? [];
    arr.push(a);
    byFloor.set(floor, arr);
    bySection.set(section, byFloor);
  }

  const result: SectionBoard[] = [];
  const fallbackFloors = Array.from({ length: Math.max(floors, 1) }, (_, i) => Math.max(floors, 1) - i);

  for (const section of sectionNumbers) {
    const byFloor = bySection.get(section);
    if (!byFloor) {
      result.push({ section, floors: fallbackFloors, columns: [], availableCount: 0, totalCount: 0 });
      continue;
    }

    byFloor.forEach((arr) => {
      arr.sort(
        (x, y) => apartmentNumber(x) - apartmentNumber(y) || x.area - y.area || x.id.localeCompare(y.id),
      );
    });

    const floorNumbers = Array.from(byFloor.keys()).sort((a, b) => b - a);
    const maxColumns = Math.max(...Array.from(byFloor.values()).map((arr) => arr.length), 0);
    const columns = Array.from({ length: maxColumns }, (_, colIndex) =>
      floorNumbers.map((floor) => byFloor.get(floor)?.[colIndex] ?? null),
    );

    const sectionApts = Array.from(byFloor.values()).flat();
    result.push({
      section,
      floors: floorNumbers,
      columns,
      availableCount: sectionApts.filter((a) => a.status === 'available').length,
      totalCount: sectionApts.length,
    });
  }

  return result;
}

export function countByStatus(apartments: Apartment[]): Record<Apartment['status'], number> {
  const c: Record<Apartment['status'], number> = { available: 0, reserved: 0, sold: 0 };
  for (const a of apartments) {
    const s = a.status ?? 'available';
    if (s in c) c[s] += 1;
  }
  return c;
}

export function isFloorFullySold(board: SectionBoard, floor: number): boolean {
  const rowIndex = board.floors.indexOf(floor);
  if (rowIndex < 0) return false;
  const cells = board.columns.map((col) => col[rowIndex]).filter(Boolean) as Apartment[];
  return cells.length > 0 && cells.every((a) => a.status === 'sold');
}
