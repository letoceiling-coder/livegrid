/** Public API response contract assertions — Iter 61. */

import { assertListingVisibilityValid } from './contracts.js';

export type ContractViolation = {
  path: string;
  message: string;
  messageRu: string;
};

export type ContractAssertResult = {
  ok: boolean;
  endpoint: string;
  violations: ContractViolation[];
};

function violation(path: string, en: string, ru: string): ContractViolation {
  return { path, message: en, messageRu: ru };
}

export function assertHealthPayload(data: unknown): ContractAssertResult {
  const violations: ContractViolation[] = [];
  const endpoint = 'GET /health';
  if (!data || typeof data !== 'object') {
    violations.push(violation('$', 'Expected object', 'Ожидался объект health'));
    return { ok: false, endpoint, violations };
  }
  const o = data as Record<string, unknown>;
  if (o.status !== 'ok' && o.status !== 'degraded') {
    violations.push(violation('status', 'status must be ok|degraded', 'status должен быть ok или degraded'));
  }
  if (!o.timestamp || typeof o.timestamp !== 'string') {
    violations.push(violation('timestamp', 'timestamp required', 'timestamp обязателен'));
  }
  const services = o.services;
  if (!services || typeof services !== 'object') {
    violations.push(violation('services', 'services object required', 'services обязателен'));
  } else {
    const db = (services as Record<string, unknown>).database;
    if (db !== 'up' && db !== 'down') {
      violations.push(violation('services.database', 'database must be up|down', 'database должен быть up или down'));
    }
  }
  return { ok: violations.length === 0, endpoint, violations };
}

export function assertRegionsPayload(data: unknown): ContractAssertResult {
  const violations: ContractViolation[] = [];
  const endpoint = 'GET /regions';
  if (!Array.isArray(data)) {
    violations.push(violation('$', 'Expected array', 'Ожидался массив регионов'));
    return { ok: false, endpoint, violations };
  }
  for (let i = 0; i < Math.min(data.length, 3); i++) {
    const r = data[i] as Record<string, unknown>;
    if (typeof r.id !== 'number') violations.push(violation(`[${i}].id`, 'id must be number', 'id региона — число'));
    if (typeof r.code !== 'string' || !r.code) {
      violations.push(violation(`[${i}].code`, 'code required', 'code региона обязателен'));
    }
    if (typeof r.name !== 'string') {
      violations.push(violation(`[${i}].name`, 'name required', 'name региона обязателен'));
    }
  }
  return { ok: violations.length === 0, endpoint, violations };
}

export function assertStatsCountersPayload(data: unknown): ContractAssertResult {
  const violations: ContractViolation[] = [];
  const endpoint = 'GET /stats/counters';
  if (!data || typeof data !== 'object') {
    violations.push(violation('$', 'Expected object', 'Ожидался объект счётчиков'));
    return { ok: false, endpoint, violations };
  }
  for (const key of ['blocks', 'apartments', 'builders', 'regions'] as const) {
    const v = (data as Record<string, unknown>)[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      violations.push(violation(key, `${key} must be finite number`, `${key} должен быть числом`));
    }
  }
  return { ok: violations.length === 0, endpoint, violations };
}

export function assertContentSettingsPayload(data: unknown): ContractAssertResult {
  const violations: ContractViolation[] = [];
  const endpoint = 'GET /content/settings';
  if (!data || typeof data !== 'object') {
    violations.push(violation('$', 'Expected object', 'Ожидался объект настроек'));
    return { ok: false, endpoint, violations };
  }
  const o = data as Record<string, unknown>;
  if (!('homepage' in o) && !('integrations' in o)) {
    violations.push(
      violation('$', 'Expected homepage or integrations group', 'Ожидалась группа homepage или integrations'),
    );
  }
  return { ok: violations.length === 0, endpoint, violations };
}

export function assertListingsPagePayload(data: unknown): ContractAssertResult {
  const violations: ContractViolation[] = [];
  const endpoint = 'GET /listings';
  if (!data || typeof data !== 'object') {
    violations.push(violation('$', 'Expected paginated object', 'Ожидался paginated ответ listings'));
    return { ok: false, endpoint, violations };
  }
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.data)) {
    violations.push(violation('data', 'data must be array', 'data должен быть массивом'));
    return { ok: false, endpoint, violations };
  }
  const meta = o.meta;
  if (!meta || typeof meta !== 'object') {
    violations.push(violation('meta', 'meta required', 'meta обязателен'));
  } else {
    const m = meta as Record<string, unknown>;
    if (typeof m.total !== 'number') violations.push(violation('meta.total', 'total required', 'meta.total обязателен'));
    if (typeof m.page !== 'number') violations.push(violation('meta.page', 'page required', 'meta.page обязателен'));
  }
  for (let i = 0; i < Math.min((o.data as unknown[]).length, 2); i++) {
    const row = (o.data as Record<string, unknown>[])[i];
    if (row.visibility != null && !assertListingVisibilityValid(String(row.visibility))) {
      violations.push(violation(`data[${i}].visibility`, 'invalid visibility', 'некорректный visibility'));
    }
  }
  return { ok: violations.length === 0, endpoint, violations };
}

export const PUBLIC_API_CONTRACTS = {
  health: assertHealthPayload,
  regions: assertRegionsPayload,
  statsCounters: assertStatsCountersPayload,
  contentSettings: assertContentSettingsPayload,
  listingsPage: assertListingsPagePayload,
} as const;

export function assertAllPublicContracts(payloads: {
  health?: unknown;
  regions?: unknown;
  statsCounters?: unknown;
  contentSettings?: unknown;
  listingsPage?: unknown;
}): ContractAssertResult[] {
  const out: ContractAssertResult[] = [];
  if (payloads.health !== undefined) out.push(assertHealthPayload(payloads.health));
  if (payloads.regions !== undefined) out.push(assertRegionsPayload(payloads.regions));
  if (payloads.statsCounters !== undefined) out.push(assertStatsCountersPayload(payloads.statsCounters));
  if (payloads.contentSettings !== undefined) out.push(assertContentSettingsPayload(payloads.contentSettings));
  if (payloads.listingsPage !== undefined) out.push(assertListingsPagePayload(payloads.listingsPage));
  return out;
}
