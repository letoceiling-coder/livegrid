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

/** Builds API contract: floors, columns, grid[][] — single source of truth. */
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
