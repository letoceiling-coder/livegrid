import { test, expect } from '../../fixtures/base';

/**
 * Mini soak (~2 min default) — CI-safe polling/navigation stress.
 * Full 60min: SOAK_DURATION_MS=3600000 pnpm test:soak:full
 */
const DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? 120_000);
const TICK_MS = 5_000;

test.describe('Mini admin soak', () => {
  test('catalog navigation loop without memory blowup', async ({ page }) => {
    test.setTimeout(DURATION_MS + 30_000);
    const startHeap =
      await page.evaluate(() =>
        (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
      );

    const deadline = Date.now() + DURATION_MS;
    let iterations = 0;

    while (Date.now() < deadline) {
      await page.goto('/catalog');
      await page.waitForLoadState('domcontentloaded');
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      iterations += 1;
      await page.waitForTimeout(TICK_MS);
    }

    const endHeap =
      await page.evaluate(() =>
        (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
      );

    expect(iterations).toBeGreaterThan(3);

    if (startHeap > 0 && endHeap > 0) {
      const growthMb = (endHeap - startHeap) / (1024 * 1024);
      expect(growthMb).toBeLessThan(150);
    }
  });
});
