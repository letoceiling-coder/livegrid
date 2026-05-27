import { describe, it, expect } from 'vitest';
import { columnFingerprintCount, isFloorFullySoldFromGrid } from './chessboard-board';
import type { ChessboardGridCell } from '@lg/shared';

function row(cells: Array<{ status: 'available' | 'reserved' | 'sold' } | null>): ChessboardGridCell[] {
  return cells.map((c, i) => ({
    floor: 1,
    shaftIndex: i + 1,
    apartment: c
      ? {
          id: `a${i}`,
          number: String(i),
          floor: 1,
          rooms: 2,
          roomLabel: '2-к.кв',
          area: 50,
          layoutFingerprint: '2|50',
          price: 1,
          pricePerMeter: 1,
          finishing: '—',
          status: c.status,
          section: 1,
          planImage: null,
        }
      : null,
  }));
}

describe('chessboard-board', () => {
  it('detects fully sold floor from API grid row', () => {
    expect(isFloorFullySoldFromGrid(row([{ status: 'sold' }, { status: 'sold' }]))).toBe(true);
    expect(isFloorFullySoldFromGrid(row([{ status: 'sold' }, { status: 'available' }]))).toBe(false);
    expect(isFloorFullySoldFromGrid(row([null, null]))).toBe(false);
  });

  it('counts distinct fingerprints per column', () => {
    const cells = [
      { apartment: { layoutFingerprint: '2|50' } },
      { apartment: { layoutFingerprint: '3|80' } },
      { apartment: { layoutFingerprint: '2|50' } },
    ];
    expect(columnFingerprintCount(cells)).toBe(2);
  });
});
