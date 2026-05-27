import type { ChessboardApartmentInput } from './types.js';

const AREA_MATCH_TOLERANCE = 4;
const ROOM_MISMATCH_PENALTY = 1000;
/** Max score to accept vertical stack pairing (same shaft). */
const STACK_MATCH_THRESHOLD = ROOM_MISMATCH_PENALTY + 50;

export function apartmentNumber(apt: ChessboardApartmentInput): number {
  const n = Number(apt.number ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function layoutFingerprint(apt: ChessboardApartmentInput): string {
  const area = Math.round(apt.area * 10) / 10;
  return `${apt.rooms}|${area}`;
}

export function matchScore(a: ChessboardApartmentInput, b: ChessboardApartmentInput): number {
  const roomPenalty = a.rooms !== b.rooms ? ROOM_MISMATCH_PENALTY : 0;
  const areaDiff = Math.abs(a.area - b.area);
  return roomPenalty + (areaDiff > AREA_MATCH_TOLERANCE ? areaDiff : 0);
}

function sortOnFloor(apartments: ChessboardApartmentInput[]): ChessboardApartmentInput[] {
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
  columns: Array<Array<ChessboardApartmentInput | null>>;
};

/**
 * Shaft-aligned matrix: columns = architectural stacks, null = empty slot preserved.
 * Column count = max apartments on any floor (TrendAgent-style fixed width).
 */
export function buildShaftMatrix(apartments: ChessboardApartmentInput[]): ShaftMatrix {
  if (!apartments.length) {
    return { floors: [], columns: [] };
  }

  const byFloor = new Map<number, ChessboardApartmentInput[]>();
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

  let columnCount = 0;
  for (const floor of floors) {
    columnCount = Math.max(columnCount, (byFloor.get(floor)?.length ?? 0));
  }
  if (columnCount === 0) {
    return { floors, columns: [] };
  }

  const floorIndex = new Map(floors.map((f, i) => [f, i]));
  const cells: Array<Array<ChessboardApartmentInput | null>> = Array.from(
    { length: columnCount },
    () => floors.map(() => null),
  );

  const columnSeed = (col: number): ChessboardApartmentInput | null => {
    for (const row of cells[col]) {
      if (row) return row;
    }
    return null;
  };

  for (const floor of floors) {
    const apts = sortOnFloor(byFloor.get(floor) ?? []);
    const rowIdx = floorIndex.get(floor)!;
    const placed = new Set<ChessboardApartmentInput>();

    const tryAssign = (apt: ChessboardApartmentInput, col: number) => {
      if (cells[col][rowIdx]) return false;
      cells[col][rowIdx] = apt;
      placed.add(apt);
      return true;
    };

    // Pass 1: stack with apartment on floor above (higher floor number).
    for (const apt of apts) {
      const aboveIdx = floorIndex.get(floor + 1);
      if (aboveIdx == null) continue;
      let bestCol = -1;
      let bestScore = Infinity;
      for (let c = 0; c < columnCount; c += 1) {
        if (cells[c][rowIdx]) continue;
        const above = cells[c][aboveIdx];
        if (!above) continue;
        const score = matchScore(apt, above);
        if (score < bestScore) {
          bestScore = score;
          bestCol = c;
        }
      }
      if (bestCol >= 0 && bestScore <= STACK_MATCH_THRESHOLD) {
        tryAssign(apt, bestCol);
      }
    }

    // Pass 2: match column seed fingerprint (any cell in column).
    for (const apt of apts) {
      if (placed.has(apt)) continue;
      let bestCol = -1;
      let bestScore = Infinity;
      for (let c = 0; c < columnCount; c += 1) {
        if (cells[c][rowIdx]) continue;
        const seed = columnSeed(c);
        if (!seed) continue;
        const score = matchScore(apt, seed);
        if (score < bestScore) {
          bestScore = score;
          bestCol = c;
        }
      }
      if (bestCol >= 0 && bestScore <= STACK_MATCH_THRESHOLD) {
        tryAssign(apt, bestCol);
      }
    }

    // Pass 3: leftmost free column (preserves order on floor).
    for (const apt of apts) {
      if (placed.has(apt)) continue;
      for (let c = 0; c < columnCount; c += 1) {
        if (!cells[c][rowIdx]) {
          tryAssign(apt, c);
          break;
        }
      }
    }
  }

  const topRow = 0;
  const colOrder = Array.from({ length: columnCount }, (_, c) => c);
  colOrder.sort((a, b) => {
    const aptA = cells[a][topRow];
    const aptB = cells[b][topRow];
    if (aptA && aptB) {
      return (
        apartmentNumber(aptA) - apartmentNumber(aptB) ||
        aptA.area - aptB.area ||
        aptA.id.localeCompare(aptB.id)
      );
    }
    if (aptA) return -1;
    if (aptB) return 1;
    const seedA = columnSeed(a);
    const seedB = columnSeed(b);
    if (seedA && seedB) {
      return apartmentNumber(seedA) - apartmentNumber(seedB);
    }
    return a - b;
  });

  const columns = colOrder.map((colIdx) => cells[colIdx].map((cell) => cell ?? null));

  return { floors, columns };
}
