import type { ChessboardGridCell } from '@lg/shared';

/** For API grid row — preserves null slots, no filter(Boolean). */
export function isFloorFullySoldFromGrid(row: ChessboardGridCell[]): boolean {
  const withApt = row.filter((c) => c.apartment != null);
  if (!withApt.length) return false;
  return withApt.every((c) => c.apartment!.status === 'sold');
}

/** Distinct layout fingerprints in a column (API columns[]), for debug purity hints. */
export function columnFingerprintCount(
  cells: Array<{ apartment: { layoutFingerprint: string } | null }>,
): number {
  const fps = new Set<string>();
  for (const cell of cells) {
    if (cell.apartment) fps.add(cell.apartment.layoutFingerprint);
  }
  return fps.size;
}
