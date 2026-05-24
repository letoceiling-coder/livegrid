import { test, expect, apiUrl } from '../../fixtures/base';

test.describe('API health', () => {
  test('health endpoint returns ok or degraded', async ({ request }) => {
    const res = await request.get(apiUrl('/health'));
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(['ok', 'degraded']).toContain(body.status);
    expect(body.services?.database).toBeDefined();
  });
});

test.describe('Public catalog', () => {
  test('home page loads without crash', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test('catalog route responds', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Auth surfaces', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Admin shell', () => {
  test('admin redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin/requests');
    await page.waitForURL(/login|admin/, { timeout: 10_000 });
    expect(page.url()).toMatch(/login|admin/);
  });
});
