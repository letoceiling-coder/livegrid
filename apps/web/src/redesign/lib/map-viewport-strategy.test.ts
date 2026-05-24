import { describe, expect, it } from 'vitest';
import {
  viewportFetchLimitForZoom,
  zoomToViewportDetailLevel,
} from './map-viewport-strategy';

describe('map-viewport-strategy', () => {
  it('maps zoom to detail levels per TЗ', () => {
    expect(zoomToViewportDetailLevel(8)).toBe('cluster');
    expect(zoomToViewportDetailLevel(10)).toBe('summary');
    expect(zoomToViewportDetailLevel(13)).toBe('summary');
    expect(zoomToViewportDetailLevel(14)).toBe('detail');
  });

  it('returns bounded fetch limits', () => {
    expect(viewportFetchLimitForZoom(8)).toBeLessThanOrEqual(200);
    expect(viewportFetchLimitForZoom(12)).toBeLessThanOrEqual(500);
    expect(viewportFetchLimitForZoom(15)).toBeLessThanOrEqual(1000);
  });
});
