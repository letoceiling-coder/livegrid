import { describe, it, expect } from 'vitest';
import {
  buildSectionBoards,
  countByStatus,
  isFloorFullySold,
  sectionNumbersFrom,
} from './chessboard-board';
import type { Apartment } from '@/redesign/data/types';

function apt(partial: Partial<Apartment> & Pick<Apartment, 'id' | 'floor' | 'section'>): Apartment {
  return {
    complexId: 'c1',
    buildingId: 'b1',
    rooms: 1,
    area: 40,
    kitchenArea: 10,
    totalFloors: 10,
    price: 8_000_000,
    pricePerMeter: 200_000,
    finishing: 'без отделки',
    status: 'available',
    planImage: '',
    section: 1,
    ...partial,
  } as Apartment;
}

describe('chessboard-board', () => {
  it('derives section numbers from apartments and count', () => {
    const nums = sectionNumbersFrom(
      [apt({ id: '1', floor: 1, section: 2 }), apt({ id: '2', floor: 2, section: 1 })],
      3,
    );
    expect(nums).toEqual([1, 2, 3]);
  });

  it('builds descending floor rows', () => {
    const boards = buildSectionBoards(
      [
        apt({ id: 'a', floor: 1, section: 1, number: '1' }),
        apt({ id: 'b', floor: 3, section: 1, number: '2' }),
        apt({ id: 'c', floor: 2, section: 1, number: '3' }),
      ],
      3,
      [1],
    );
    expect(boards[0].floors).toEqual([3, 2, 1]);
    expect(boards[0].availableCount).toBe(3);
  });

  it('counts statuses', () => {
    const c = countByStatus([
      apt({ id: '1', floor: 1, section: 1, status: 'available' }),
      apt({ id: '2', floor: 1, section: 1, status: 'sold' }),
      apt({ id: '3', floor: 2, section: 1, status: 'reserved' }),
    ]);
    expect(c).toEqual({ available: 1, reserved: 1, sold: 1 });
  });

  it('detects fully sold floor', () => {
    const boards = buildSectionBoards(
      [
        apt({ id: '1', floor: 5, section: 1, status: 'sold' }),
        apt({ id: '2', floor: 5, section: 1, status: 'sold' }),
        apt({ id: '3', floor: 4, section: 1, status: 'available' }),
      ],
      5,
      [1],
    );
    expect(isFloorFullySold(boards[0], 5)).toBe(true);
    expect(isFloorFullySold(boards[0], 4)).toBe(false);
  });
});
