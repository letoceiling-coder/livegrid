import { describe, expect, it } from 'vitest';
import {
  buildArchitecturalMatrix,
  buildArchitecturalMatrixWithTopology,
  buildShaftMatrix,
  matchScore,
  planSignature,
} from './matrix.js';
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

const PLAN_76 =
  'https://cdn-dataout.trendagent.ru/images/ks/example-76.png';
const PLAN_STUDIO =
  'https://cdn-dataout.trendagent.ru/images/ks/example-studio.png';

describe('buildArchitecturalMatrix', () => {
  it('prefers low score for same layout on adjacent floors', () => {
    const a = apt({ id: '1', floor: 1, rooms: 3, area: 93.2 });
    const b = apt({ id: '2', floor: 1, rooms: 3, area: 93.3 });
    const c = apt({ id: '3', floor: 1, rooms: 2, area: 49 });
    expect(matchScore(a, b)).toBeLessThan(matchScore(a, c));
  });

  it('is fully deterministic: same input always produces identical topology', () => {
    const input = [
      apt({ id: 'a', floor: 3, number: '301', rooms: 2, area: 55 }),
      apt({ id: 'b', floor: 3, number: '302', rooms: 3, area: 80 }),
      apt({ id: 'c', floor: 2, number: '201', rooms: 2, area: 55 }),
      apt({ id: 'd', floor: 1, number: '101', rooms: 2, area: 55 }),
      apt({ id: 'e', floor: 1, number: '102', rooms: 3, area: 80 }),
    ];
    const run1 = buildArchitecturalMatrixWithTopology([...input]);
    const run2 = buildArchitecturalMatrixWithTopology([...input].reverse());
    expect(run1.topology.apartmentToShaft).toEqual(run2.topology.apartmentToShaft);
    const groups = (topo: typeof run1.topology) =>
      topo.shafts.map((s) => [...s.apartmentIds].sort().join('|')).sort();
    expect(groups(run1.topology)).toEqual(groups(run2.topology));
    expect(run1.matrix).toEqual(run2.matrix);
  });

  it('buildShaftMatrix is an alias for buildArchitecturalMatrix', () => {
    const input = [apt({ id: 'x', floor: 2, number: '201' })];
    expect(buildShaftMatrix(input)).toEqual(buildArchitecturalMatrix(input));
  });

  it('places vertical plan chains in the same column (not number-rank)', () => {
    const matrix = buildArchitecturalMatrix([
      apt({
        id: 'top',
        floor: 16,
        number: '160',
        rooms: 3,
        area: 76.3,
        planImage: PLAN_76,
      }),
      apt({
        id: 'mid',
        floor: 11,
        number: '105',
        rooms: 3,
        area: 76.3,
        planImage: PLAN_76,
      }),
      apt({
        id: 'low',
        floor: 6,
        number: '50',
        rooms: 3,
        area: 76.3,
        planImage: PLAN_76,
      }),
      apt({
        id: 'other',
        floor: 11,
        number: '97',
        rooms: 3,
        area: 62.2,
        planImage: 'https://cdn-dataout.trendagent.ru/images/other-62.png',
      }),
    ]);

    const colLow = matrix.columns.findIndex((col) =>
      col.some((cell) => cell?.id === 'low'),
    );
    const colMid = matrix.columns.findIndex((col) =>
      col.some((cell) => cell?.id === 'mid'),
    );
    const colTop = matrix.columns.findIndex((col) =>
      col.some((cell) => cell?.id === 'top'),
    );

    expect(colLow).toBe(colMid);
    expect(colMid).toBe(colTop);
    expect(colLow).toBeGreaterThanOrEqual(0);
  });

  it('never shifts apartments to fill empty slots (columns are immutable)', () => {
    const matrix = buildArchitecturalMatrix([
      apt({ id: 'a', floor: 3, number: '301' }),
      apt({ id: 'b', floor: 3, number: '302' }),
      apt({ id: 'c', floor: 3, number: '303' }),
      apt({ id: 'd', floor: 2, number: '201', planImage: PLAN_STUDIO }),
    ]);
    expect(matrix.columns.length).toBeGreaterThanOrEqual(3);
    const rowFloor2 = matrix.columns.map((col) => col[matrix.floors.indexOf(2)]);
    const occupied = rowFloor2.filter((c) => c != null);
    expect(occupied).toHaveLength(1);
    expect(rowFloor2.some((c) => c === null)).toBe(true);
  });

  it('luxury building: variable apts per floor with aligned 76.3 shaft', () => {
    const matrix = buildArchitecturalMatrix([
      apt({
        id: 'f16a',
        floor: 16,
        number: '158',
        rooms: 0,
        area: 24.3,
        planImage: PLAN_STUDIO,
      }),
      apt({
        id: 'f16b',
        floor: 16,
        number: '159',
        rooms: 0,
        area: 24.3,
        planImage: PLAN_STUDIO,
      }),
      apt({
        id: 'f16c',
        floor: 16,
        number: '160',
        rooms: 3,
        area: 76.3,
        planImage: PLAN_76,
      }),
      apt({
        id: 'f17a',
        floor: 17,
        number: '170',
        rooms: 0,
        area: 24.3,
        planImage: PLAN_STUDIO,
      }),
      apt({
        id: 'f11a',
        floor: 11,
        number: '97',
        rooms: 3,
        area: 62.2,
        planImage: 'https://cdn-dataout.trendagent.ru/images/other-62.png',
      }),
      apt({
        id: 'f11b',
        floor: 11,
        number: '105',
        rooms: 3,
        area: 76.3,
        planImage: PLAN_76,
      }),
      apt({
        id: 'f6a',
        floor: 6,
        number: '50',
        rooms: 3,
        area: 76.3,
        planImage: PLAN_76,
      }),
    ]);

    expect(matrix.columns.length).toBeGreaterThanOrEqual(3);

    const shaft76 = matrix.columns.find((col) =>
      col.some((cell) => cell?.id === 'f6a'),
    );
    expect(shaft76?.some((cell) => cell?.id === 'f11b')).toBe(true);
    expect(shaft76?.some((cell) => cell?.id === 'f16c')).toBe(true);
  });

  it('aligns repeating layouts in the same shaft column', () => {
    const plan93 = 'https://cdn-dataout.trendagent.ru/images/plan-93.png';
    const { topology } = buildArchitecturalMatrixWithTopology([
      apt({
        id: 'top',
        floor: 34,
        number: '326',
        rooms: 3,
        area: 93.2,
        planImage: plan93,
      }),
      apt({
        id: 'bridge-33',
        floor: 33,
        number: '318',
        rooms: 3,
        area: 93.2,
        planImage: plan93,
      }),
      apt({
        id: 'mid-4e',
        floor: 33,
        number: '319',
        rooms: 4,
        area: 93.9,
        planImage: 'https://cdn-dataout.trendagent.ru/images/plan-94.png',
      }),
      apt({
        id: 'mid-2e',
        floor: 33,
        number: '322',
        rooms: 2,
        area: 49.3,
        planImage: 'https://cdn-dataout.trendagent.ru/images/plan-49.png',
      }),
      apt({
        id: 'low-3e',
        floor: 31,
        number: '302',
        rooms: 3,
        area: 93.2,
        planImage: plan93,
      }),
      apt({
        id: 'low-2e',
        floor: 31,
        number: '304',
        rooms: 2,
        area: 47.4,
        planImage: 'https://cdn-dataout.trendagent.ru/images/plan-47.png',
      }),
    ]);
    expect(topology.apartmentToShaft.top).toBe(topology.apartmentToShaft['low-3e']);
    expect(topology.apartmentToShaft.top).toBe(topology.apartmentToShaft['bridge-33']);
  });

  it('preserves empty slots for missing apartments on a floor', () => {
    const matrix = buildArchitecturalMatrix([
      apt({ id: 'a', floor: 2, number: '201', rooms: 1, area: 40, planImage: PLAN_STUDIO }),
      apt({ id: 'b', floor: 1, number: '101', rooms: 1, area: 40, planImage: PLAN_STUDIO }),
      apt({
        id: 'c',
        floor: 1,
        number: '102',
        rooms: 2,
        area: 55,
        planImage: 'https://cdn-dataout.trendagent.ru/images/plan-55.png',
      }),
    ]);

    expect(matrix.floors).toEqual([2, 1]);
    const rowFloor2 = matrix.columns.map((col) => col[0]);
    expect(rowFloor2.filter((c) => c != null)).toHaveLength(1);
    expect(rowFloor2.some((c) => c === null)).toBe(true);
  });

  it('grid width covers busiest floor', () => {
    const matrix = buildArchitecturalMatrix([
      apt({ id: 'a', floor: 3, number: '301' }),
      apt({ id: 'b', floor: 3, number: '302' }),
      apt({ id: 'c', floor: 3, number: '303' }),
      apt({ id: 'd', floor: 2, number: '201' }),
    ]);
    expect(matrix.columns.length).toBeGreaterThanOrEqual(3);
  });

  it('planSignature normalizes URL paths', () => {
    const a = apt({
      id: '1',
      floor: 1,
      planImage: 'https://cdn.example.com/a/b.png?x=1',
    });
    const b = apt({
      id: '2',
      floor: 2,
      planImage: 'https://cdn.example.com/a/b.png?y=2',
    });
    expect(planSignature(a)).toBe(planSignature(b));
  });
});
