import { describe, it, expect } from 'vitest';
import {
  complexCompletionLine,
  complexImageOverlayLines,
  complexRoomBandLabel,
} from '@/redesign/lib/card-visual';
import type { ResidentialComplex } from '@/redesign/data/types';

const base: ResidentialComplex = {
  id: '1',
  slug: 'test',
  name: 'Test',
  description: '',
  builder: 'Dev',
  district: '—',
  subway: '—',
  subwayDistance: '—',
  address: 'Addr',
  deadline: '2029 2 квартал',
  status: 'completed',
  priceFrom: 0,
  priceTo: 0,
  images: [],
  coords: [0, 0],
  advantages: [],
  infrastructure: [],
  buildings: [],
};

describe('card-visual complex helpers', () => {
  it('formats room band labels', () => {
    expect(complexRoomBandLabel(0)).toBe('Студии');
    expect(complexRoomBandLabel(2)).toBe('2Е-к.кв');
  });

  it('builds sales overlay lines', () => {
    const lines = complexImageOverlayLines({
      ...base,
      salesStartDate: '2026-05-01T00:00:00.000Z',
      buildings: [{ id: 'b1', complexId: '1', name: 'корпус 4.1', floors: 1, sections: 1, deadline: '', apartments: [] }],
    });
    expect(lines.primary).toBe('Старт продаж');
    expect(lines.secondary).toMatch(/корпус 4\.1/);
  });

  it('emphasizes completion line', () => {
    expect(complexCompletionLine(base)).toMatch(/^Сдан —/);
  });
});
