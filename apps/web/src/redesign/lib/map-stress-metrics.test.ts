import { describe, it, expect } from 'vitest';
import {
  estimatePlacemarkMemoryKb,
  pushSample,
  sampleAvg,
  samplePercentile,
  thresholdClass,
  thresholdFpsClass,
} from './map-stress-metrics';

describe('map-stress-metrics', () => {
  it('computes rolling avg and p95', () => {
    let samples: number[] = [];
    for (const v of [100, 200, 300, 400, 500]) {
      samples = pushSample(samples, v);
    }
    expect(sampleAvg(samples)).toBe(300);
    expect(samplePercentile(samples, 95)).toBe(500);
  });

  it('estimates placemark memory', () => {
    expect(estimatePlacemarkMemoryKb(6533)).toBeGreaterThan(12000);
  });

  it('classifies thresholds', () => {
    expect(thresholdClass(400, 500, 2000)).toBe('green');
    expect(thresholdClass(1000, 500, 2000)).toBe('yellow');
    expect(thresholdClass(3000, 500, 2000)).toBe('red');
    expect(thresholdFpsClass(55)).toBe('green');
    expect(thresholdFpsClass(35)).toBe('yellow');
    expect(thresholdFpsClass(20)).toBe('red');
  });
});
