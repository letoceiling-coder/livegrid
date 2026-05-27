import { describe, expect, it } from 'vitest';
import { minCostAssignment } from './matching.js';

describe('minCostAssignment', () => {
  it('picks minimum total cost pairing', () => {
    const cost = [
      [9, 2, 7],
      [6, 4, 3],
      [5, 8, 1],
    ];
    const assign = minCostAssignment(cost);
    const total =
      cost[0]![assign[0]!]! + cost[1]![assign[1]!]! + cost[2]![assign[2]!]!;
    expect(total).toBe(9);
    expect(assign[0]).toBe(1);
    expect(assign[1]).toBe(0);
    expect(assign[2]).toBe(2);
  });

  it('handles rectangular matrices via padding', () => {
    const cost = [
      [1, 10],
      [10, 1],
    ];
    const assign = minCostAssignment(cost);
    expect(assign[0]).toBe(0);
    expect(assign[1]).toBe(1);
  });
});
