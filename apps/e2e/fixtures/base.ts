import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('favicon') || text.includes('DevTools')) return;
        // eslint-disable-next-line no-console
        console.warn(`[console.error] ${text}`);
      }
    });
    await use(page);
  },
});

export { expect };

export function apiUrl(path: string): string {
  const base = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000';
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}/api/v1${p}`;
}
