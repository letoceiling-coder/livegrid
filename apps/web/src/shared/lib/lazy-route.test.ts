import { describe, it, expect, beforeEach } from 'vitest';
import { clearLazyImportFailures, getLazyImportFailures, lazyWithReload } from '@/shared/lib/lazy-route';

describe('lazyWithReload', () => {
  beforeEach(() => {
    clearLazyImportFailures();
  });

  it('starts with empty failure list', () => {
    expect(getLazyImportFailures()).toEqual([]);
  });

  it('creates lazy component with route id overload', () => {
    const Comp = lazyWithReload('TestRoute', () => import('@/pages/NotFound'));
    expect(Comp).toBeDefined();
    expect(typeof Comp).toBe('object');
  });

  it('supports legacy single-arg factory', () => {
    const Comp = lazyWithReload(() => import('@/pages/NotFound'));
    expect(Comp).toBeDefined();
  });
});
