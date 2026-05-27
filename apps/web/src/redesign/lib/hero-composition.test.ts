import { describe, expect, it } from 'vitest';
import {
  computeArchitecturalCoverPosition,
  shouldUseContainForHero,
} from '@/redesign/lib/hero-composition';

describe('computeArchitecturalCoverPosition', () => {
  it('returns center for invalid dimensions', () => {
    expect(computeArchitecturalCoverPosition(0, 100, 400, 300)).toBe('center center');
  });

  it('returns center when image is wider than container needs', () => {
    expect(computeArchitecturalCoverPosition(1920, 1080, 800, 500)).toBe('center center');
  });

  it('returns center for portrait images', () => {
    expect(computeArchitecturalCoverPosition(900, 1600, 800, 400)).toBe('center center');
  });

  it('biases Y downward when container is relatively wider (vertical crop)', () => {
    const pos = computeArchitecturalCoverPosition(1200, 900, 800, 400);
    expect(pos).toMatch(/^center \d+(\.\d+)?%$/);
    const y = Number(pos.split(' ')[1]?.replace('%', ''));
    expect(y).toBeGreaterThan(50);
    expect(y).toBeLessThanOrEqual(72);
  });

  it('caps bias for extreme aspect mismatch', () => {
    const pos = computeArchitecturalCoverPosition(1000, 2000, 800, 200);
    expect(pos).toBe('center center');
  });
});

describe('shouldUseContainForHero', () => {
  it('is false for landscape', () => {
    expect(shouldUseContainForHero(1600, 900)).toBe(false);
  });

  it('is true for very portrait', () => {
    expect(shouldUseContainForHero(600, 1200)).toBe(true);
  });
});
