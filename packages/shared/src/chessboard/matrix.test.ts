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

  it('is fully deterministic: same input always produces identical output', () => {
    const input = [
      apt({ id: 'a', floor: 3, number: '301', rooms: 2, area: 55 }),
      apt({ id: 'b', floor: 3, number: '302', rooms: 3, area: 80 }),
      apt({ id: 'c', floor: 2, number: '201', rooms: 2, area: 55 }),
      apt({ id: 'd', floor: 1, number: '101', rooms: 2, area: 55 }),
      apt({ id: 'e', floor: 1, number: '102', rooms: 3, area: 80 }),
    ];
    const run1 = buildShaftMatrix([...input]);
    const run2 = buildShaftMatrix([...input].reverse());
    expect(run1.floors).toEqual(run2.floors);
    expect(run1.columns.length).toBe(run2.columns.length);
    for (let c = 0; c < run1.columns.length; c++) {
      for (let r = 0; r < run1.floors.length; r++) {
        expect(run1.columns[c][r]?.id).toBe(run2.columns[c][r]?.id);
      }
    }
  });

  it('assigns column by number-rank within floor (lower number = leftmost)', () => {
    // Floor 3: two apts [301, 302]. 301 should be col 0, 302 should be col 1.
    const matrix = buildShaftMatrix([
      apt({ id: 'high', floor: 3, number: '302', rooms: 3, area: 80 }),
      apt({ id: 'low',  floor: 3, number: '301', rooms: 2, area: 55 }),
      apt({ id: 'mid',  floor: 2, number: '201', rooms: 2, area: 55 }),
    ]);
    // col 0 on floor 3 must be apt '301' (lower number)
    expect(matrix.columns[0][0]?.id).toBe('low');
    // col 1 on floor 3 must be apt '302' (higher number)
    expect(matrix.columns[1][0]?.id).toBe('high');
    // col 1 on floor 2 must be null (only 1 apt on floor 2)
    expect(matrix.columns[1][1]).toBeNull();
    // col 0 on floor 2 = apt '201' (leftmost rank on that floor)
    expect(matrix.columns[0][1]?.id).toBe('mid');
  });

  it('never shifts apartments to fill empty slots (columns are immutable)', () => {
    // Floor 3 has 3 apts, floor 2 has only 1. Columns 1 and 2 on floor 2 must be null.
    const matrix = buildShaftMatrix([
      apt({ id: 'a', floor: 3, number: '301' }),
      apt({ id: 'b', floor: 3, number: '302' }),
      apt({ id: 'c', floor: 3, number: '303' }),
      apt({ id: 'd', floor: 2, number: '201' }),
    ]);
    expect(matrix.columns.length).toBe(3);
    // Only col 0 on floor 2 has an apartment
    expect(matrix.columns[0][1]?.id).toBe('d');
    expect(matrix.columns[1][1]).toBeNull();
    expect(matrix.columns[2][1]).toBeNull();
  });

  it('luxury building: variable apts per floor gives 3 fixed columns', () => {
    // Mirrors Shelepiha Tower A: max 3 apts/floor, many floors with 1-2
    const matrix = buildShaftMatrix([
      apt({ id: 'f16a', floor: 16, number: '158', rooms: 0, area: 24.3 }),
      apt({ id: 'f16b', floor: 16, number: '159', rooms: 0, area: 24.3 }),
      apt({ id: 'f16c', floor: 16, number: '160', rooms: 3, area: 76.3 }),
      apt({ id: 'f17a', floor: 17, number: '170', rooms: 0, area: 24.3 }),
      apt({ id: 'f11a', floor: 11, number: '97',  rooms: 3, area: 62.2 }),
      apt({ id: 'f11b', floor: 11, number: '105', rooms: 3, area: 76.3 }),
      apt({ id: 'f6a',  floor: 6,  number: '50',  rooms: 3, area: 76.3 }),
    ]);
    // 3 columns (max per floor = 3)
    expect(matrix.columns.length).toBe(3);
    // Floor 17 row: col0=f17a, col1=null, col2=null
    const rowF17 = matrix.columns.map((col) => col[matrix.floors.indexOf(17)]?.id ?? null);
    expect(rowF17).toEqual(['f17a', null, null]);
    // Floor 16 row: col0=f16a, col1=f16b, col2=f16c
    const rowF16 = matrix.columns.map((col) => col[matrix.floors.indexOf(16)]?.id ?? null);
    expect(rowF16).toEqual(['f16a', 'f16b', 'f16c']);
    // Floor 6 row: col0=f6a, col1=null, col2=null
    const rowF6 = matrix.columns.map((col) => col[matrix.floors.indexOf(6)]?.id ?? null);
    expect(rowF6).toEqual(['f6a', null, null]);
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
