import type { ChessboardApartmentInput } from './types.js';

const AREA_MATCH_TOLERANCE = 4;
const ROOM_MISMATCH_PENALTY = 1000;

export function apartmentNumber(apt: ChessboardApartmentInput): number {
  const n = Number(apt.number ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function layoutFingerprint(apt: ChessboardApartmentInput): string {
  const area = Math.round(apt.area * 10) / 10;
  return `${apt.rooms}|${area}`;
}

/** Kept for test compatibility and external callers. Not used for placement. */
export function matchScore(a: ChessboardApartmentInput, b: ChessboardApartmentInput): number {
  const roomPenalty = a.rooms !== b.rooms ? ROOM_MISMATCH_PENALTY : 0;
  const areaDiff = Math.abs(a.area - b.area);
  return roomPenalty + (areaDiff > AREA_MATCH_TOLERANCE ? areaDiff : 0);
}

/**
 * Sort apartments within a floor deterministically.
 * Primary: apartment number (ascending) — architectural left-to-right position.
 * Fallback: area asc, then id (stable tie-break for identical numbers).
 */
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
  /** columns[shaftIndex][floorRowIndex] — null = architectural placeholder (empty slot). */
  columns: Array<Array<ChessboardApartmentInput | null>>;
};

/**
 * ARCHITECTURAL MATRIX ENGINE v2
 *
 * Builds a fixed-column matrix where each column = one architectural shaft.
 *
 * Algorithm:
 *   1. Group apartments by floor.
 *   2. Sort apartments within each floor by apartment number ascending.
 *      → rank 0 = leftmost position, rank 1 = next, etc.
 *   3. columnCount = max apartments on any floor (fixed width, never changes).
 *   4. Place apartments deterministically: rank within floor → column index.
 *   5. Missing slots → null (architectural placeholder, never shifted).
 *
 * Guarantees:
 *   - Same input always produces identical output (deterministic).
 *   - Column count is fixed; columns are never deleted or reordered.
 *   - Empty cells are preserved as null, not compacted.
 *   - Frontend receives a complete, ready-to-render matrix.
 *
 * Why number-rank over plan-image clustering:
 *   - Luxury buildings (e.g. Shelepiha) have unique plans per floor; clustering
 *     produces one column per unique plan (~20+), which is nonsensical visually.
 *   - Standard mass-market buildings have sequential apartment numbering;
 *     rank-within-floor naturally maps to architectural shaft position.
 *   - Both cases produce the correct column count (max per floor) and stable columns.
 */
export function buildShaftMatrix(apartments: ChessboardApartmentInput[]): ShaftMatrix {
  if (!apartments.length) {
    return { floors: [], columns: [] };
  }

  // Step 1: group by floor, sort each floor by apartment number.
  const byFloor = new Map<number, ChessboardApartmentInput[]>();
  for (const apt of apartments) {
    const floor = apt.floor || 1;
    const list = byFloor.get(floor) ?? [];
    list.push(apt);
    byFloor.set(floor, list);
  }
  for (const [floor, list] of byFloor) {
    byFloor.set(floor, sortOnFloor(list));
  }

  // Step 2: build floor range (descending: top → bottom).
  const allFloors = [...byFloor.keys()].sort((a, b) => a - b);
  const minFloor = allFloors[0];
  const maxFloor = allFloors[allFloors.length - 1];
  const floors: number[] = [];
  for (let f = maxFloor; f >= minFloor; f -= 1) {
    floors.push(f);
  }

  // Step 3: column count = max apartments on any floor (immutable after this).
  let columnCount = 0;
  for (const list of byFloor.values()) {
    if (list.length > columnCount) columnCount = list.length;
  }
  if (columnCount === 0) {
    return { floors, columns: [] };
  }

  // Step 4: allocate grid (columns × rows), all null = architectural placeholder.
  const floorIndex = new Map(floors.map((f, i) => [f, i]));
  const columns: Array<Array<ChessboardApartmentInput | null>> = Array.from(
    { length: columnCount },
    () => new Array<ChessboardApartmentInput | null>(floors.length).fill(null),
  );

  // Step 5: deterministic placement — rank within sorted floor → column index.
  for (const [floor, sortedApts] of byFloor) {
    const rowIdx = floorIndex.get(floor);
    if (rowIdx == null) continue;
    for (let colIdx = 0; colIdx < sortedApts.length; colIdx += 1) {
      columns[colIdx][rowIdx] = sortedApts[colIdx];
    }
    // Columns beyond sortedApts.length remain null → preserved placeholder.
  }

  return { floors, columns };
}
