import { describe, expect, it } from 'vitest';
import { buildShaftMatrix, matchScore } from './matrix.js';
import type { ChessboardApartmentInput } from './types.js';

function apt(
  partial: Partial<ChessboardApartmentInput> & Pick<ChessboardApartmentInput, 'id' | 'floor'>,
): ChessboardApartmentInput {
  return {
    rooms: 2,
    area: 50,
    price: 10_000_000,
    status: 'available',
    ...partial,
  };
}

describe('buildShaftMatrix', () => {
  it('prefers low score for same layout on adjacent floors', () => {
    const a = apt({ id: '1', floor: 1, rooms: 3, area: 93.2 });
    const b = apt({ id: '2', floor: 1, rooms: 3, area: 93.3 });
    const c = apt({ id: '3', floor: 1, rooms: 2, area: 49 });
    expect(matchScore(a, b)).toBeLessThan(matchScore(a, c));
  });

  it('aligns repeating layouts in the same shaft column', () => {
    const matrix = buildShaftMatrix([
      apt({ id: 'top', floor: 34, number: '326', rooms: 3, area: 93.2 }),
      apt({ id: 'mid-4e', floor: 33, number: '319', rooms: 4, area: 93.9 }),
      apt({ id: 'mid-2e', floor: 33, number: '322', rooms: 2, area: 49.3 }),
      apt({ id: 'low-3e', floor: 31, number: '302', rooms: 3, area: 93.2 }),
      apt({ id: 'low-2e', floor: 31, number: '304', rooms: 2, area: 47.4 }),
    ]);

    expect(matrix.floors).toEqual([34, 33, 32, 31]);
    const colWithTop = matrix.columns.find((col) => col[0]?.id === 'top');
    expect(colWithTop?.[3]?.id).toBe('low-3e');
  });

  it('preserves empty slots for missing apartments on a floor', () => {
    const matrix = buildShaftMatrix([
      apt({ id: 'a', floor: 2, number: '201', rooms: 1, area: 40 }),
      apt({ id: 'b', floor: 1, number: '101', rooms: 1, area: 40 }),
      apt({ id: 'c', floor: 1, number: '102', rooms: 2, area: 55 }),
    ]);

    expect(matrix.floors).toEqual([2, 1]);
    const rowFloor2 = matrix.columns.map((col) => col[0]);
    expect(rowFloor2.filter((c) => c != null)).toHaveLength(1);
    expect(rowFloor2.some((c) => c === null)).toBe(true);
  });

  it('uses max apartments per floor as column count', () => {
    const matrix = buildShaftMatrix([
      apt({ id: 'a', floor: 3, number: '301' }),
      apt({ id: 'b', floor: 3, number: '302' }),
      apt({ id: 'c', floor: 3, number: '303' }),
      apt({ id: 'd', floor: 2, number: '201' }),
    ]);
    expect(matrix.columns.length).toBe(3);
    expect(matrix.columns[0][1]?.id).toBe('d');
  });
});
