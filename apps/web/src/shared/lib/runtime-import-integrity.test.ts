import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LAZY_ROUTE_REGISTRY, RUNTIME_HOOK_REGISTRY } from '@/shared/lib/route-registry';

describe('runtime import integrity', () => {
  it('App.tsx imports auth symbols from canonical hook module', () => {
    const appSrc = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
    expect(appSrc).toMatch(/import\s*\{[^}]*useAuthState[^}]*\}\s*from\s*['"]@\/shared\/hooks\/useAuth['"]/);
    expect(appSrc).toMatch(/import\s*\{[^}]*AuthProvider[^}]*\}\s*from\s*['"]@\/shared\/hooks\/useAuth['"]/);
    expect(appSrc).toMatch(/import\s*\{[^}]*useAuth[^}]*\}\s*from\s*['"]@\/shared\/hooks\/useAuth['"]/);
  });

  for (const hook of RUNTIME_HOOK_REGISTRY) {
    describe(hook.path, () => {
      for (const exportName of hook.exports) {
        it(`exports ${exportName}`, async () => {
          const mod = await import(hook.path);
          expect(mod[exportName], `${exportName} must be defined`).toBeDefined();
          expect(typeof mod[exportName]).not.toBe('undefined');
        });
      }
    });
  }

  for (const route of LAZY_ROUTE_REGISTRY) {
    it(
      `lazy module ${route.id} has default export`,
      async () => {
        const mod = await import(route.path);
        expect(mod.default, `${route.path} default export`).toBeDefined();
      },
      30_000,
    );
  }
});
