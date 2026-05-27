import type { Apartment } from '@/redesign/data/types';

/** Match tolerance for vertical stack pairing (m²). */
const AREA_MATCH_TOLERANCE = 4;

const ROOM_MISMATCH_PENALTY = 1000;

export function apartmentNumber(apt: Apartment): number {
  const n = Number(apt.number ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function layoutFingerprint(apt: Apartment): string {
  const area = Math.round(apt.area * 10) / 10;
  return `${apt.rooms}|${area}`;
}

export function matchScore(a: Apartment, b: Apartment): number {
  const roomPenalty = a.rooms !== b.rooms ? ROOM_MISMATCH_PENALTY : 0;
  const areaDiff = Math.abs(a.area - b.area);
  return roomPenalty + (areaDiff > AREA_MATCH_TOLERANCE ? areaDiff : 0);
}

function sortOnFloor(apartments: Apartment[]): Apartment[] {
  return [...apartments].sort(
    (a, b) =>
      apartmentNumber(a) - apartmentNumber(b) ||
      a.area - b.area ||
      a.id.localeCompare(b.id),
  );
}

export type ShaftMatrix = {
  /** Floors descending (top → bottom). */
  floors: number[];
  /** columns[shaftIndex][floorRowIndex] */
  columns: Array<Array<Apartment | null>>;
};

/**
 * Builds a shaft-aligned chessboard matrix.
 * Columns = vertical stacks; missing apartments render as null (empty slot).
 */
export function buildShaftMatrix(apartments: Apartment[]): ShaftMatrix {
  if (!apartments.length) {
    return { floors: [], columns: [] };
  }

  const byFloor = new Map<number, Apartment[]>();
  for (const apt of apartments) {
    const floor = apt.floor || 1;
    const list = byFloor.get(floor) ?? [];
    list.push(apt);
    byFloor.set(floor, list);
  }

  const minFloor = Math.min(...byFloor.keys());
  const maxFloor = Math.max(...byFloor.keys());
  const floors: number[] = [];
  for (let f = maxFloor; f >= minFloor; f -= 1) {
    floors.push(f);
  }

  const cellByFloorCol = new Map<number, Map<number, Apartment>>();
  let columnCount = 0;
  const anchors: Apartment[] = [];

  for (const floor of floors) {
    const apts = sortOnFloor(byFloor.get(floor) ?? []);
    const usedCols = new Set<number>();
    const floorAbove = floor + 1;

    for (const apt of apts) {
      let bestCol = -1;
      let bestScore = Infinity;

      const aboveMap = cellByFloorCol.get(floorAbove);
      for (let c = 0; c < columnCount; c += 1) {
        if (usedCols.has(c)) continue;
        const refAbove = aboveMap?.get(c);
        if (!refAbove) continue;
        const score = matchScore(apt, refAbove);
        if (score < bestScore) {
          bestScore = score;
          bestCol = c;
        }
      }

      if (bestCol < 0) {
        for (let c = 0; c < columnCount; c += 1) {
          if (usedCols.has(c)) continue;
          const score = matchScore(apt, anchors[c]);
          if (score < bestScore) {
            bestScore = score;
            bestCol = c;
          }
        }
      }

      if (bestCol < 0) {
        bestCol = columnCount;
        columnCount += 1;
        anchors.push(apt);
      }

      usedCols.add(bestCol);
      const floorMap = cellByFloorCol.get(floor) ?? new Map<number, Apartment>();
      floorMap.set(bestCol, apt);
      cellByFloorCol.set(floor, floorMap);
    }
  }

  if (columnCount === 0) {
    return { floors, columns: [] };
  }

  const topFloor = floors[0];
  const colOrder = Array.from({ length: columnCount }, (_, c) => c);
  colOrder.sort((a, b) => {
    const aptA = cellByFloorCol.get(topFloor)?.get(a);
    const aptB = cellByFloorCol.get(topFloor)?.get(b);
    if (aptA && aptB) {
      return (
        apartmentNumber(aptA) - apartmentNumber(aptB) ||
        aptA.area - aptB.area ||
        aptA.id.localeCompare(aptB.id)
      );
    }
    if (aptA) return -1;
    if (aptB) return 1;
    return a - b;
  });

  const columns: Array<Array<Apartment | null>> = colOrder.map((colIdx) =>
    floors.map((floor) => cellByFloorCol.get(floor)?.get(colIdx) ?? null),
  );

  return { floors, columns };
}
