import { test, expect } from '../../fixtures/base';

/** Manual / nightly — 60min admin session simulation (not CI default). */
const DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? 3_600_000);
const TICK_MS = 30_000;

test.describe('Admin session soak', () => {
  test('long admin navigation session', async ({ page }) => {
    test.setTimeout(DURATION_MS + 120_000);

    const routes = ['/admin/ops', '/admin/requests', '/admin/tasks', '/admin/trust', '/admin/system'];
    const deadline = Date.now() + DURATION_MS;
    let ticks = 0;

    while (Date.now() < deadline) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        ticks += 1;
      }
      await page.waitForTimeout(TICK_MS);
    }

    expect(ticks).toBeGreaterThan(0);
  });
});
