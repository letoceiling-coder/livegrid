import { buildShaftMatrix } from './matrix.js';
import type {
  ChessboardApartmentInput,
  ChessboardApartmentCell,
  ChessboardBuildingMatrix,
  ChessboardGridCell,
} from './types.js';

export function chessboardBuildingLabel(name: string, id: string): string {
  const n = (name || `Корпус ${id}`).trim();
  if (/^корп\.?\s/i.test(n)) return n;
  return `Корп. ${n}`;
}

function roomLabel(rooms: number): string {
  if (rooms === 0) return 'Студия';
  if (rooms > 0) return `${rooms}-к.кв`;
  return '';
}

function toCellApartment(apt: ChessboardApartmentInput): ChessboardApartmentCell {
  const area = apt.area;
  const price = apt.price;
  return {
    id: apt.id,
    number: apt.number != null ? String(apt.number) : '',
    floor: apt.floor,
    rooms: apt.rooms,
    roomLabel: roomLabel(apt.rooms),
    area,
    layoutFingerprint: `${apt.rooms}|${Math.round(area * 10) / 10}`,
    price,
    pricePerMeter: apt.pricePerMeter ?? (area > 0 ? Math.round(price / area) : 0),
    finishing: apt.finishing ?? '—',
    status: apt.status,
    section: apt.section ?? 1,
    planImage: apt.planImage ?? null,
  };
}

/**
 * Derives a human-readable diagnostic label for a shaft column.
 * Uses the most common layout fingerprint from all non-null cells.
 * Example: "2|45.1" → "2-к|45.1"  "0|24.3" → "Студия|24.3"
 */
function deriveShaftLabel(col: Array<ChessboardApartmentInput | null>): string {
  const counts = new Map<string, number>();
  for (const apt of col) {
    if (!apt) continue;
    const key = `${apt.rooms}|${Math.round(apt.area * 10) / 10}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.size) return '—';
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [rooms, area] = top[0].split('|');
  const r = Number(rooms);
  const prefix = r === 0 ? 'Студия' : `${r}-к.кв`;
  return `${prefix} ${area}м²`;
}

/**
 * Builds the full API contract: floors, columns, grid[][] — single source of truth.
 *
 * Uses the deterministic Architectural Matrix Engine (buildShaftMatrix v2):
 *   - Apartments ranked by number within each floor → fixed column assignment.
 *   - Column count = max apartments per floor (immutable after build).
 *   - Null cells = architectural placeholders, never shifted.
 *   - Frontend receives a complete, ready-to-render matrix.
 */
export function buildChessboardBuildingMatrix(
  buildingId: string,
  buildingName: string,
  apartments: ChessboardApartmentInput[],
): ChessboardBuildingMatrix {
  const { floors, columns } = buildShaftMatrix(apartments);
  const shaftCount = columns.length;

  const statusCounts = { available: 0, reserved: 0, sold: 0 };
  for (const a of apartments) {
    statusCounts[a.status] += 1;
  }

  const columnDtos = columns.map((col, idx) => ({
    shaftIndex: idx + 1,
    shaftLabel: deriveShaftLabel(col),
    cells: floors.map((floor, rowIndex) => ({
      floor,
      apartment: col[rowIndex] ? toCellApartment(col[rowIndex]!) : null,
    })),
  }));

  const grid: ChessboardGridCell[][] = floors.map((floor, rowIndex) =>
    columns.map((col, colIndex) => ({
      floor,
      shaftIndex: colIndex + 1,
      apartment: col[rowIndex] ? toCellApartment(col[rowIndex]!) : null,
    })),
  );

  return {
    id: buildingId,
    name: buildingName,
    tabLabel: chessboardBuildingLabel(buildingName, buildingId),
    apartmentCount: apartments.length,
    statusCounts,
    floors,
    shaftCount,
    columns: columnDtos,
    grid,
  };
}
