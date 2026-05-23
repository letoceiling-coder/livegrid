/**
 * Derived request attribution — no UTM warehouse, URL + object linkage only (Iter 38).
 */

export type AttributionSourceType =
  | 'MAP_POPUP'
  | 'CATALOG_CARD'
  | 'COMPLEX_PAGE'
  | 'APARTMENT_PAGE'
  | 'LISTING_PAGE'
  | 'HOME_PAGE'
  | 'CONTACTS'
  | 'SELECTION'
  | 'TELEGRAM'
  | 'DIRECT'
  | 'UNKNOWN';

export type AttributionInput = {
  sourceUrl?: string | null;
  blockId?: number | null;
  listingId?: number | null;
  comment?: string | null;
  telegramSent?: boolean;
};

export type RequestAttribution = {
  sourceType: AttributionSourceType;
  label: string;
  conversionSurface: string;
  landingPath: string | null;
};

export const ATTRIBUTION_SOURCE_LABEL: Record<AttributionSourceType, string> = {
  MAP_POPUP: 'Карта',
  CATALOG_CARD: 'Каталог',
  COMPLEX_PAGE: 'Страница ЖК',
  APARTMENT_PAGE: 'Страница квартиры',
  LISTING_PAGE: 'Объявление',
  HOME_PAGE: 'Главная',
  CONTACTS: 'Контакты',
  SELECTION: 'Подборка',
  TELEGRAM: 'Telegram',
  DIRECT: 'Прямой / без URL',
  UNKNOWN: 'Неизвестно',
};

const TERMINAL = new Set(['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED']);

export function classifyRequestAttribution(input: AttributionInput): RequestAttribution {
  if (input.telegramSent || (input.sourceUrl ?? '').startsWith('telegram')) {
    return {
      sourceType: 'TELEGRAM',
      label: ATTRIBUTION_SOURCE_LABEL.TELEGRAM,
      conversionSurface: 'telegram_bot',
      landingPath: null,
    };
  }

  if (!input.sourceUrl?.trim()) {
    if (input.listingId) {
      return {
        sourceType: 'LISTING_PAGE',
        label: ATTRIBUTION_SOURCE_LABEL.LISTING_PAGE,
        conversionSurface: 'object_link',
        landingPath: null,
      };
    }
    if (input.blockId) {
      return {
        sourceType: 'COMPLEX_PAGE',
        label: ATTRIBUTION_SOURCE_LABEL.COMPLEX_PAGE,
        conversionSurface: 'object_link',
        landingPath: null,
      };
    }
    return {
      sourceType: 'DIRECT',
      label: ATTRIBUTION_SOURCE_LABEL.DIRECT,
      conversionSurface: 'direct',
      landingPath: null,
    };
  }

  const raw = input.sourceUrl.trim();
  const path = parseLandingPath(raw);
  if (path == null) {
    return {
      sourceType: 'UNKNOWN',
      label: ATTRIBUTION_SOURCE_LABEL.UNKNOWN,
      conversionSurface: 'unknown',
      landingPath: raw.slice(0, 120),
    };
  }

  if (path === '/' || path === '') {
    return surf('HOME_PAGE', 'home', path);
  }
  if (path.startsWith('/map')) {
    return surf('MAP_POPUP', 'map_popup', path);
  }
  if (path.startsWith('/complex/')) {
    return surf('COMPLEX_PAGE', 'complex_page', path);
  }
  if (path.startsWith('/apartment/')) {
    return surf('APARTMENT_PAGE', 'apartment_page', path);
  }
  if (path.startsWith('/listing/')) {
    return surf('LISTING_PAGE', 'listing_page', path);
  }
  if (path.startsWith('/catalog')) {
    return surf('CATALOG_CARD', 'catalog', path);
  }
  if (path.startsWith('/contacts')) {
    return surf('CONTACTS', 'contacts', path);
  }
  if (path.startsWith('/selection')) {
    return surf('SELECTION', 'selection', path);
  }
  if (path.startsWith('/layouts/')) {
    return surf('COMPLEX_PAGE', 'layouts', path);
  }

  return surf('UNKNOWN', 'other', path);
}

function parseLandingPath(raw: string): string | null {
  const httpMatch = raw.match(/^https?:\/\/[^/]+(\/[^?#]*)/i);
  if (httpMatch?.[1]) {
    const p = httpMatch[1].replace(/\/+$/, '');
    return p || '/';
  }
  if (raw.startsWith('/')) {
    return raw.split('?')[0]?.split('#')[0]?.replace(/\/+$/, '') || '/';
  }
  return null;
}

function surf(
  sourceType: AttributionSourceType,
  conversionSurface: string,
  landingPath: string,
): RequestAttribution {
  return {
    sourceType,
    label: ATTRIBUTION_SOURCE_LABEL[sourceType],
    conversionSurface,
    landingPath,
  };
}

export type SourceAggregateRow = {
  sourceType: AttributionSourceType;
  label: string;
  inflow: number;
  open: number;
  overdue: number;
  stale: number;
  success: number;
  spam: number;
  overduePct: number;
  successPct: number;
  reopenCount: number;
};

export type ObjectPressureRow = {
  objectKind: 'block' | 'listing';
  objectId: number;
  objectName: string;
  inflow: number;
  open: number;
  overdue: number;
  stale: number;
  pressureScore: number;
  reopenCount: number;
};

export type AttributionHint = {
  code: string;
  severity: 'green' | 'yellow' | 'red';
  message: string;
};

export function analyzeAttributionHints(
  attr: RequestAttribution,
  ctx?: {
    sourceReopenPct?: number;
    sourceOverduePct?: number;
    blockPressureScore?: number;
    blockName?: string | null;
  },
): AttributionHint[] {
  const hints: AttributionHint[] = [];

  hints.push({
    code: 'source_surface',
    severity: 'green',
    message: `Лид: ${attr.label}`,
  });

  if (attr.sourceType === 'MAP_POPUP') {
    hints.push({
      code: 'map_lead',
      severity: 'yellow',
      message: 'Лид пришёл с карты ЖК',
    });
  }

  if (ctx?.sourceReopenPct != null && ctx.sourceReopenPct >= 20) {
    hints.push({
      code: 'source_reopen',
      severity: ctx.sourceReopenPct >= 35 ? 'red' : 'yellow',
      message: 'Источник даёт высокий reopen rate',
    });
  }

  if (ctx?.sourceOverduePct != null && ctx.sourceOverduePct >= 30) {
    hints.push({
      code: 'source_sla_pressure',
      severity: 'red',
      message: 'Источник создаёт SLA-давление',
    });
  }

  if (ctx?.blockPressureScore != null && ctx.blockPressureScore >= 5 && ctx.blockName) {
    hints.push({
      code: 'block_overload',
      severity: ctx.blockPressureScore >= 8 ? 'red' : 'yellow',
      message: `ЖК «${ctx.blockName}» перегружает менеджеров`,
    });
  }

  return hints;
}

export function aggregateBySource<
  T extends AttributionInput & {
    status: string;
    slaState?: 'OVERDUE' | 'STALE' | 'OK';
    isReopen?: boolean;
  },
>(rows: T[]): SourceAggregateRow[] {
  const map = new Map<AttributionSourceType, SourceAggregateRow>();

  for (const r of rows) {
    const { sourceType, label } = classifyRequestAttribution(r);
    if (!map.has(sourceType)) {
      map.set(sourceType, {
        sourceType,
        label,
        inflow: 0,
        open: 0,
        overdue: 0,
        stale: 0,
        success: 0,
        spam: 0,
        overduePct: 0,
        successPct: 0,
        reopenCount: 0,
      });
    }
    const row = map.get(sourceType)!;
    row.inflow += 1;
    if (!TERMINAL.has(r.status)) {
      row.open += 1;
      if (r.slaState === 'OVERDUE') row.overdue += 1;
      if (r.slaState === 'STALE') row.stale += 1;
    }
    if (r.status === 'SUCCESS' || r.status === 'COMPLETED') row.success += 1;
    if (r.status === 'SPAM') row.spam += 1;
    if (r.isReopen) row.reopenCount += 1;
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      overduePct: row.open > 0 ? Math.round((row.overdue / row.open) * 100) : 0,
      successPct: row.inflow > 0 ? Math.round((row.success / row.inflow) * 100) : 0,
    }))
    .sort((a, b) => b.inflow - a.inflow);
}

export function detectPipelineBottlenecks(sources: SourceAggregateRow[]): string[] {
  const warnings: string[] = [];
  const map = sources.find((s) => s.sourceType === 'MAP_POPUP');
  const apt = sources.find((s) => s.sourceType === 'APARTMENT_PAGE');

  if (map && apt && map.open >= 3 && apt.open >= 3) {
    if (map.overduePct > apt.overduePct + 15) {
      warnings.push('Лиды с карты обрабатываются медленнее (выше просрочка)');
    }
  }

  for (const s of sources) {
    if (s.inflow >= 5 && s.overduePct >= 35) {
      warnings.push(`${s.label}: высокое SLA-давление (${s.overduePct}% просроч.)`);
    }
    if (s.inflow >= 5 && s.reopenCount >= 2 && s.inflow > 0) {
      const rp = Math.round((s.reopenCount / s.inflow) * 100);
      if (rp >= 15) warnings.push(`${s.label}: частые reopen (${rp}%)`);
    }
  }

  return warnings.slice(0, 5);
}
