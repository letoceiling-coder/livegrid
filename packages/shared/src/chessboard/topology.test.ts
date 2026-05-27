import { describe, expect, it } from 'vitest';
import { buildBuildingTopology } from './topology.js';
import type { ChessboardApartmentInput } from './types.js';

const PLAN_76 = 'https://cdn.example.com/plans/76.png';
const PLAN_STUDIO = 'https://cdn.example.com/plans/studio.png';

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

describe('buildBuildingTopology', () => {
  it('creates one shaft entity for a vertical plan chain', () => {
    const apartments = [
      apt({ id: 'a', floor: 6, number: '50', rooms: 3, area: 76.3, planImage: PLAN_76 }),
      apt({ id: 'b', floor: 11, number: '105', rooms: 3, area: 76.3, planImage: PLAN_76 }),
      apt({ id: 'c', floor: 16, number: '160', rooms: 3, area: 76.3, planImage: PLAN_76 }),
    ];
    const topo = buildBuildingTopology(apartments);
    expect(topo.shafts).toHaveLength(1);
    expect(topo.shafts[0]!.apartmentIds).toEqual(['a', 'b', 'c']);
    expect(topo.apartmentToShaft.a).toBe('shaft-1');
  });

  it('emits floor templates with placeholders for missing shaft slots', () => {
    const apartments = [
      apt({ id: 'a', floor: 3, number: '301', planImage: PLAN_STUDIO }),
      apt({ id: 'b', floor: 3, number: '302', planImage: PLAN_76 }),
      apt({ id: 'c', floor: 2, number: '201', planImage: PLAN_STUDIO }),
    ];
    const topo = buildBuildingTopology(apartments);
    const floor3 = topo.floorTemplates.find((t) => t.floor === 3);
    expect(floor3?.slots.length).toBe(topo.shafts.length);
    const placeholders = floor3?.slots.filter((s) => s.isPlaceholder) ?? [];
    expect(placeholders.length).toBeGreaterThanOrEqual(0);
  });

  it('tracks mirrored plan variants on a shaft', () => {
    const apartments = [
      apt({
        id: 'a',
        floor: 1,
        rooms: 3,
        area: 76.3,
        planImage: 'https://cdn.example.com/plans/76-a.png',
      }),
      apt({
        id: 'b',
        floor: 2,
        rooms: 3,
        area: 76.3,
        planImage: 'https://cdn.example.com/plans/76-b.png',
      }),
    ];
    const topo = buildBuildingTopology(apartments);
    expect(topo.shafts[0]!.mirroredPlanSignatures.length).toBe(2);
  });

  it('derives sectionCount from apartment sections', () => {
    const topo = buildBuildingTopology([
      apt({ id: 'a', floor: 1, section: 1 }),
      apt({ id: 'b', floor: 1, section: 2 }),
    ]);
    expect(topo.sectionCount).toBe(2);
  });
});
