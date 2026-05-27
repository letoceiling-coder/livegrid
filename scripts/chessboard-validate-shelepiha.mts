#!/usr/bin/env npx tsx
/**
 * Validates architectural column purity for Shelepiha export / live API shape.
 * Usage: pnpm exec tsx scripts/chessboard-validate-shelepiha.mts [path-to-json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function findRepoRoot(start: string): string {
  let dir = start;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = dirname(dir);
  }
  return start;
}
import {
  buildArchitecturalMatrixWithTopology,
  layoutFingerprint,
  type ChessboardApartmentInput,
} from '../packages/shared/dist/chessboard/index.js';

type ExportBuilding = {
  id: string;
  name: string;
  apartments: Array<{
    id: string;
    number?: string;
    floor: number;
    rooms: number;
    area: number;
    price: number;
    status: 'available' | 'reserved' | 'sold';
    planImage?: string | null;
  }>;
  chessboard?: {
    buildings?: never;
  };
};

type ExportDoc = {
  buildings: ExportBuilding[];
};

const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));
const defaultPath = resolve(repoRoot, 'docs/data/shelepiha-chessboard.json');
const jsonPath = process.argv[2] ? resolve(process.argv[2]) : defaultPath;

const doc = JSON.parse(readFileSync(jsonPath, 'utf8')) as ExportDoc;

function toInput(
  a: ExportBuilding['apartments'][number],
): ChessboardApartmentInput {
  return {
    id: String(a.id),
    number: a.number != null ? String(a.number) : undefined,
    floor: a.floor,
    rooms: a.rooms,
    area: a.area,
    price: a.price,
    status: a.status,
    planImage: a.planImage ?? null,
  };
}

function columnPurityReport(
  buildingName: string,
  matrix: ReturnType<typeof buildArchitecturalMatrixWithTopology>['matrix'],
): { worstCol: number; worstUnique: number; violations: string[] } {
  const violations: string[] = [];
  let worstCol = -1;
  let worstUnique = 0;

  matrix.columns.forEach((col, colIdx) => {
    const fps = new Set<string>();
    for (const cell of col) {
      if (!cell) continue;
      fps.add(layoutFingerprint(cell));
    }
    if (fps.size > worstUnique) {
      worstUnique = fps.size;
      worstCol = colIdx;
    }
    if (fps.size > 6) {
      violations.push(
        `${buildingName} col ${colIdx + 1}: ${fps.size} distinct fingerprints (degraded)`,
      );
    }
  });

  return { worstCol, worstUnique, violations };
}

let exitCode = 0;

for (const b of doc.buildings) {
  const input = b.apartments.map(toInput);
  const { matrix, topology } = buildArchitecturalMatrixWithTopology(input);
  const report = columnPurityReport(b.name, matrix);

  console.log(`\n=== ${b.name} (${b.id}) ===`);
  console.log(`  apartments: ${input.length}`);
  console.log(`  floors: ${matrix.floors.length}, columns: ${matrix.columns.length}, shafts: ${topology.shafts.length}`);
  console.log(`  topology sections: ${topology.sectionCount}, floor templates: ${topology.floorTemplates.length}`);
  console.log(`  worst column purity: col ${report.worstCol + 1} → ${report.worstUnique} unique layouts`);

  const fp76 = '3|76.3';
  const ids76 = input.filter((a) => layoutFingerprint(a) === fp76).map((a) => a.id);
  if (ids76.length >= 2) {
    const cols = new Set(
      ids76.map((id) =>
        matrix.columns.findIndex((col) => col.some((c) => c?.id === id)),
      ),
    );
    console.log(`  3|76.3 chain (${ids76.length} apts): ${cols.size} column(s) — want 1`);
    if (cols.size > 1) {
      exitCode = 1;
      console.log('  FAIL: 76.3 layout split across columns');
    } else {
      console.log('  OK: vertical chain aligned');
    }
  }

  for (const v of report.violations) console.log(`  WARN: ${v}`);
}

process.exit(exitCode);
