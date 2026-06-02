import type { ChessboardGridCell } from '@lg/shared';
import type { Apartment } from '@/redesign/data/types';
import { apartmentNumber, buildShaftMatrix } from '@/redesign/lib/chessboard-matrix';
import type { ChessboardApartmentInput } from '@lg/shared';

export type { apartmentNumber } from '@/redesign/lib/chessboard-matrix';

export type SectionBoard = {
  section: number;
  floors: number[];
  columns: Array<Array<Apartment | null>>;
  availableCount: number;
  totalCount: number;
};

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
  const bySection = new Map<number, Apartment[]>();
  for (const a of apartments) {
    const section = Number(a.section ?? 1) || 1;
    const list = bySection.get(section) ?? [];
    list.push(a);
    bySection.set(section, list);
  }

  const result: SectionBoard[] = [];
  const fallbackFloors = Array.from({ length: Math.max(floors, 1) }, (_, i) => Math.max(floors, 1) - i);

  for (const section of sectionNumbers) {
    const sectionApts = bySection.get(section) ?? [];
    if (!sectionApts.length) {
      result.push({ section, floors: fallbackFloors, columns: [], availableCount: 0, totalCount: 0 });
      continue;
    }

    const { floors: floorNumbers, columns } = buildShaftMatrix(
      sectionApts.map(apartmentToChessboardInput),
    );

    result.push({
      section,
      floors: floorNumbers.length ? floorNumbers : fallbackFloors,
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
  const cells = board.columns.map((col) => col[rowIndex]).filter((a): a is Apartment => a != null);
  return cells.length > 0 && cells.every((a) => a.status === 'sold');
}

/** For API grid row — preserves null slots, no filter(Boolean). */
export function isFloorFullySoldFromGrid(row: ChessboardGridCell[]): boolean {
  const withApt = row.filter((c) => c.apartment != null);
  if (!withApt.length) return false;
  return withApt.every((c) => c.apartment!.status === 'sold');
}

export function apartmentToChessboardInput(a: Apartment): ChessboardApartmentInput {
  return {
    id: a.id,
    number: a.number,
    floor: a.floor,
    rooms: a.rooms,
    area: a.area,
    price: a.price,
    pricePerMeter: a.pricePerMeter,
    finishing: a.finishing,
    status: a.status,
    section: a.section,
    planImage: a.planImage,
  };
}
