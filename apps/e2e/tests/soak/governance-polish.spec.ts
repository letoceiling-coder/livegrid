import { test, expect, apiUrl } from '../../fixtures/base';

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const SOAK_MS = Number(process.env.SOAK_DURATION_MS ?? 120_000);
const TICK_MS = 5_000;

test.describe('Governance polish soak', () => {
  test('public catalog + map loop (65k dataset)', async ({ page, request }) => {
    test.setTimeout(SOAK_MS + 60_000);

    const counts = await request.get(apiUrl('/blocks/catalog-counts?region_id=1'));
    expect(counts.ok()).toBeTruthy();
    const body = await counts.json();
    expect(body.apartments).toBeGreaterThan(50_000);

    const startHeap = await page.evaluate(() =>
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
    );

    const routes = ['/', '/catalog', '/map', '/catalog?page=2'];
    const deadline = Date.now() + SOAK_MS;
    let iterations = 0;

    while (Date.now() < deadline) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toBeVisible();
        iterations += 1;
      }
      await page.waitForTimeout(TICK_MS);
    }

    const endHeap = await page.evaluate(() =>
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
    );

    expect(iterations).toBeGreaterThan(4);
    if (startHeap > 0 && endHeap > 0) {
      expect((endHeap - startHeap) / (1024 * 1024)).toBeLessThan(180);
    }
  });

  test('mobile 360px catalog usability', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/catalog');
    await page.waitForLoadState('domcontentloaded');
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflowX).toBe(false);
    await expect(page.locator('body')).toBeVisible();
  });

  test('sitemap index reachable', async ({ request }) => {
    const res = await request.get(`${BASE.replace(/\/$/, '')}/api/v1/sitemap/sitemap-index.xml`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('sitemapindex');
    expect(text).toContain('apartments-1.xml');
  });
});
