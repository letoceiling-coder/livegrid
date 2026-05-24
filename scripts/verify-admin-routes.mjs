#!/usr/bin/env node
/**
 * Smoke-test critical admin API routes (Iter 82).
 * Usage: API_BASE=https://livegrid.ru/api JWT=eyJ... node scripts/verify-admin-routes.mjs
 */
const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');
const JWT = process.env.JWT || '';

const ROUTES = [
  { method: 'GET', path: '/admin/tasks/summary', required: true },
  { method: 'GET', path: '/admin/tasks?filter=today&page=1', required: true },
  { method: 'GET', path: '/admin/automation/metrics', required: true },
  { method: 'GET', path: '/admin/moderation/listings?page=1&per_page=5', required: true },
  { method: 'GET', path: '/admin/trust/metrics', required: true },
  { method: 'GET', path: '/admin/billing/metrics', required: true },
  { method: 'GET', path: '/admin/ops/summary', required: true },
  { method: 'GET', path: '/admin/system/route-contract', required: true },
  { method: 'GET', path: '/admin/system/diagnostics', required: true },
  { method: 'GET', path: '/admin/ecosystem/metrics', required: false },
  { method: 'GET', path: '/admin/discovery/metrics', required: false },
];

async function check(route) {
  const url = `${API_BASE}${route.path}`;
  const headers = JWT ? { Authorization: `Bearer ${JWT}` } : {};
  try {
    const res = await fetch(url, { method: route.method, headers });
    const ok = res.status >= 200 && res.status < 300;
    return { ...route, status: res.status, ok };
  } catch (e) {
    return { ...route, status: 0, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log(`API_BASE=${API_BASE}`);
  console.log(`JWT=${JWT ? '(set)' : '(missing — expect 401 on protected routes)'}\n`);

  const results = await Promise.all(ROUTES.map(check));
  let failed = 0;

  for (const r of results) {
    const mark = r.ok ? 'OK' : r.status === 401 && !JWT ? 'AUTH' : 'FAIL';
    if (!r.ok && r.required && mark !== 'AUTH') failed += 1;
    console.log(`${mark.padEnd(5)} ${r.status.toString().padStart(3)} ${r.method} ${r.path}${r.error ? ` (${r.error})` : ''}`);
  }

  console.log('');
  if (failed > 0) {
    console.error(`FAILED: ${failed} required route(s)`);
    process.exit(1);
  }
  console.log('All required routes reachable (or auth-only without JWT).');
}

main();
