#!/usr/bin/env node
/**
 * Public + admin SPA route smoke (Iter 84) — HTTP status checks only.
 * Usage: SITE=https://livegrid.ru node scripts/verify-public-routes.mjs
 */
const SITE = (process.env.SITE || 'https://livegrid.ru').replace(/\/$/, '');

const PUBLIC_ROUTES = [
  '/',
  '/catalog',
  '/map',
  '/complex/shelepiha',
  '/complex/kottedzhnyj-poselok-sof-ino-2',
  '/favorites',
];

const ADMIN_ROUTES = [
  '/admin/system',
  '/admin/feed-import',
  '/admin/tasks',
  '/admin/moderation/listings',
];

async function check(path) {
  const url = `${SITE}${path}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return { path, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (e) {
    return { path, status: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log(`SITE=${SITE}\n`);
  const routes = [...PUBLIC_ROUTES, ...ADMIN_ROUTES];
  const results = await Promise.all(routes.map(check));
  let failed = 0;

  for (const r of results) {
    const mark = r.ok ? 'OK' : 'FAIL';
    if (!r.ok) failed += 1;
    console.log(`${mark.padEnd(5)} ${String(r.status).padStart(3)} ${r.path}${r.error ? ` (${r.error})` : ''}`);
  }

  console.log('');
  if (failed > 0) {
    console.error(`FAILED: ${failed} route(s)`);
    process.exit(1);
  }
  console.log('All public/admin SPA routes reachable.');
}

main();
