import { describe, it, expect } from 'vitest';
import { buildRoomCategoryGroups, roomCategoryFromRooms } from './complex-room-groups';

describe('complex-room-groups', () => {
  it('buckets 4+ rooms', () => {
    expect(roomCategoryFromRooms(4)).toBe(4);
    expect(roomCategoryFromRooms(5)).toBe(4);
  });

  it('builds non-empty groups only', () => {
    const groups = buildRoomCategoryGroups([
      { rooms: 0, price: 5_000_000, area: 28 } as never,
      { rooms: 1, price: 8_000_000, area: 42 } as never,
      { rooms: 1, price: 9_000_000, area: 44 } as never,
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].count).toBe(1);
    expect(groups[1].count).toBe(2);
    expect(groups[1].priceMin).toBe(8_000_000);
    expect(groups[1].priceMax).toBe(9_000_000);
  });
});
