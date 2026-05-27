/**
 * Export Shelepiha chessboard data (both towers) to JSON.
 * Run: node --import tsx scripts/export-shelepiha-chessboard.mts
 *   or: cd apps/web && pnpm exec tsx ../../scripts/export-shelepiha-chessboard.mts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://livegrid.ru/api/v1';
const SLUG = 'shelepiha';

const AREA_MATCH_TOLERANCE = 4;
const ROOM_MISMATCH_PENALTY = 1000;

type AptStatus = 'available' | 'reserved' | 'sold';

type Apt = {
  id: string;
  number: string;
  floor: number;
  rooms: number;
  area: number;
  price: number;
  pricePerMeter: number;
  finishing: string;
  status: AptStatus;
  section: number;
  planImage: string | null;
  buildingId: string;
  listingId: string;
};

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roomsFromRoomTypeName(name: string | undefined): number {
  const n = (name ?? '').toLowerCase();
  if (n.includes('студ')) return 0;
  const m = n.match(/(\d)/);
  if (m) return Math.min(4, parseInt(m[1], 10));
  return 1;
}

function listingStatus(s: string): AptStatus {
  if (s === 'RESERVED') return 'reserved';
  if (s === 'SOLD') return 'sold';
  return 'available';
}

function mapFinishing(name: string | undefined): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('чернов')) return 'черновая';
  if (n.includes('без отделк')) return 'без отделки';
  if (n.includes('под ключ')) return 'под ключ';
  return 'чистовая';
}

function apartmentNumber(apt: Apt): number {
  const n = Number(apt.number);
  return Number.isFinite(n) ? n : 0;
}

function layoutFingerprint(apt: Apt): string {
  const area = Math.round(apt.area * 10) / 10;
  return `${apt.rooms}|${area}`;
}

function matchScore(a: Apt, b: Apt): number {
  const roomPenalty = a.rooms !== b.rooms ? ROOM_MISMATCH_PENALTY : 0;
  const areaDiff = Math.abs(a.area - b.area);
  return roomPenalty + (areaDiff > AREA_MATCH_TOLERANCE ? areaDiff : 0);
}

function sortOnFloor(apartments: Apt[]): Apt[] {
  return [...apartments].sort(
    (a, b) =>
      apartmentNumber(a) - apartmentNumber(b) ||
      a.area - b.area ||
      a.id.localeCompare(b.id),
  );
}

function buildShaftMatrix(apartments: Apt[]) {
  if (!apartments.length) return { floors: [] as number[], columns: [] as Array<Array<Apt | null>> };

  const byFloor = new Map<number, Apt[]>();
  for (const apt of apartments) {
    const floor = apt.floor || 1;
    const list = byFloor.get(floor) ?? [];
    list.push(apt);
    byFloor.set(floor, list);
  }

  const minFloor = Math.min(...byFloor.keys());
  const maxFloor = Math.max(...byFloor.keys());
  const floors: number[] = [];
  for (let f = maxFloor; f >= minFloor; f -= 1) floors.push(f);

  const cellByFloorCol = new Map<number, Map<number, Apt>>();
  let columnCount = 0;
  const anchors: Apt[] = [];

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
      const floorMap = cellByFloorCol.get(floor) ?? new Map<number, Apt>();
      floorMap.set(bestCol, apt);
      cellByFloorCol.set(floor, floorMap);
    }
  }

  if (columnCount === 0) return { floors, columns: [] };

  const topFloor = floors[0];
  const colOrder = Array.from({ length: columnCount }, (_, c) => c);
  colOrder.sort((a, b) => {
    const aptA = cellByFloorCol.get(topFloor)?.get(a);
    const aptB = cellByFloorCol.get(topFloor)?.get(b);
    if (aptA && aptB) {
      return apartmentNumber(aptA) - apartmentNumber(aptB) || aptA.area - aptB.area || aptA.id.localeCompare(aptB.id);
    }
    if (aptA) return -1;
    if (aptB) return 1;
    return a - b;
  });

  const columns = colOrder.map((colIdx) =>
    floors.map((floor) => cellByFloorCol.get(floor)?.get(colIdx) ?? null),
  );

  return { floors, columns };
}

function chessboardBuildingLabel(name: string, id: string): string {
  const n = (name || `Корпус ${id}`).trim();
  if (/^корп\.?\s/i.test(n)) return n;
  return `Корп. ${n}`;
}

function apartmentExport(a: Apt) {
  return {
    id: a.id,
    listingId: a.listingId,
    number: a.number,
    floor: a.floor,
    rooms: a.rooms,
    roomLabel: a.rooms === 0 ? 'Студия' : `${a.rooms}-к.кв`,
    area: a.area,
    layoutFingerprint: layoutFingerprint(a),
    price: a.price,
    pricePerMeter: a.pricePerMeter,
    finishing: a.finishing,
    status: a.status,
    section: a.section,
    planImage: a.planImage,
    url: `https://livegrid.ru/apartment/${a.id}`,
  };
}

function boardToExport(floors: number[], columns: Array<Array<Apt | null>>) {
  return {
    floorCount: floors.length,
    floors,
    shaftCount: columns.length,
    columns: columns.map((col, shaftIndex) => ({
      shaftIndex: shaftIndex + 1,
      cells: floors.map((floor, rowIndex) => ({
        floor,
        apartment: col[rowIndex] ? apartmentExport(col[rowIndex]!) : null,
      })),
    })),
    grid: floors.map((floor, rowIndex) =>
      columns.map((col, colIndex) => ({
        floor,
        shaftIndex: colIndex + 1,
        apartment: col[rowIndex] ? apartmentExport(col[rowIndex]!) : null,
      })),
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListing(row: any, complexId: string, buildingId: string): Apt | null {
  const apt = row.apartment;
  if (!apt) return null;
  const area = num(apt.areaTotal);
  const price = num(row.price);
  return {
    id: String(row.id),
    listingId: String(row.id),
    buildingId,
    number: String(apt.number ?? ''),
    floor: num(apt.floor) || 1,
    rooms: roomsFromRoomTypeName(apt.roomType?.name),
    area,
    price,
    pricePerMeter: area > 0 ? Math.round(price / area) : 0,
    finishing: mapFinishing(apt.finishing?.name),
    status: listingStatus(row.status),
    section: num(apt.section) || 1,
    planImage: apt.planUrl ? String(apt.planUrl) : null,
  };
}

async function main() {
  const blockRes = await fetch(`${API}/blocks/${SLUG}`);
  if (!blockRes.ok) throw new Error(`blocks: ${blockRes.status}`);
  const block = await blockRes.json();

  const listingsRes = await fetch(`${API}/listings?block_id=${block.id}&per_page=500`);
  if (!listingsRes.ok) throw new Error(`listings: ${listingsRes.status}`);
  const listingsJson = await listingsRes.json();
  const listingRows: unknown[] = listingsJson.data ?? [];

  const complexId = String(block.id);
  const rawBuildings = block.buildings ?? [];

  const buildings = rawBuildings.map((raw: { id: number; name: string | null; queue?: string | null; deadline?: string | null }, idx: number) => {
    const id = String(raw.id);
    const apts = listingRows
      .filter((r) => String((r as { buildingId?: number }).buildingId) === id)
      .map((r) => mapListing(r, complexId, id))
      .filter((x): x is Apt => x != null);

    const matrix = buildShaftMatrix(apts);
    const statusCounts = { available: 0, reserved: 0, sold: 0 };
    for (const a of apts) statusCounts[a.status] += 1;

    const floorSet = apts.map((a) => a.floor);
    const minFloor = floorSet.length ? Math.min(...floorSet) : 0;
    const maxFloor = floorSet.length ? Math.max(...floorSet) : 0;
    const maxFloorDeclared = apts.reduce((m, a) => Math.max(m, a.floor), 0);

    return {
      id,
      name: raw.name ?? `Корпус ${idx + 1}`,
      queue: raw.queue ?? null,
      deadline: raw.deadline ?? null,
      tabLabel: chessboardBuildingLabel(raw.name ?? '', id),
      floorsMeta: {
        maxFloorFromApartments: maxFloorDeclared,
        minFloorWithData: minFloor,
        maxFloorWithData: maxFloor,
      },
      apartmentCount: apts.length,
      statusCounts,
      apartments: [...apts]
        .sort(
          (x, y) =>
            y.floor - x.floor ||
            String(x.number).localeCompare(String(y.number), 'ru', { numeric: true }),
        )
        .map(apartmentExport),
      chessboard: boardToExport(matrix.floors, matrix.columns),
    };
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    source: {
      livegridPage: `https://livegrid.ru/complex/${SLUG}/`,
      trendAgentReference: 'https://msk.trendagent.ru/object/shelepiha/checkerboard',
      api: {
        block: `${API}/blocks/${SLUG}`,
        listings: `${API}/listings?block_id=${block.id}&per_page=500`,
      },
      listingRowsFetched: listingRows.length,
      note:
        'chessboard — shaft-aligned matrix (same algorithm as production). apartments — flat list, floor DESC.',
    },
    complex: {
      id: block.id,
      slug: block.slug,
      name: block.name,
      buildingCount: buildings.length,
    },
    buildings,
  };

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = join(root, 'docs', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'shelepiha-chessboard.json');
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
  for (const b of buildings) {
    console.log(`  ${b.tabLabel}: ${b.apartmentCount} apts, ${b.chessboard.shaftCount} shafts, floors ${b.chessboard.floors[0]}→${b.chessboard.floors[b.chessboard.floors.length - 1]}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
