import { describe, it, expect } from 'vitest';
import { LAZY_ROUTE_REGISTRY, RUNTIME_HOOK_REGISTRY, findRouteById } from '@/shared/lib/route-registry';

describe('route registry', () => {
  it('includes critical admin and ecosystem routes', () => {
    expect(findRouteById('AdminModerationReview')).toBeDefined();
    expect(findRouteById('PublicAgencyPage')).toBeDefined();
    expect(LAZY_ROUTE_REGISTRY.length).toBeGreaterThanOrEqual(15);
  });

  it('each entry has id and @/ path', () => {
    for (const r of LAZY_ROUTE_REGISTRY) {
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.path.startsWith('@/')).toBe(true);
    }
  });
});

describe('runtime hook registry', () => {
  it('lists auth exports', () => {
    expect(RUNTIME_HOOK_REGISTRY.some((h) => h.exports.includes('useAuthState'))).toBe(true);
  });
});
