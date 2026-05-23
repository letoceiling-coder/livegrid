/**
 * Conversion outcome + deal quality — rule-based, no AI (Iter 40).
 */

import { classifyRequestAttribution, type AttributionSourceType } from './request-attribution.js';
import { extractStageEntries, type LifecycleEventInput, type LifecycleRequestInput } from './pipeline-lifecycle.js';

export type QualitySeverity = 'green' | 'yellow' | 'red';

export type OutcomeQualityHint = {
  code: string;
  severity: QualitySeverity;
  message: string;
};

export type OutcomeEventInput = LifecycleEventInput & {
  note?: string | null;
  actorId?: string | null;
};

export type OutcomeRequestInput = LifecycleRequestInput & {
  assignedTo?: string | null;
  sourceUrl?: string | null;
  blockId?: number | null;
  listingId?: number | null;
  comment?: string | null;
  telegramSent?: boolean;
};

export type OutcomeClass =
  | 'strong_success'
  | 'weak_success'
  | 'unstable_success'
  | 'recovered_success'
  | 'abandoned_negotiation'
  | 'fake_progression'
  | 'spam_fast'
  | 'healthy_lifecycle'
  | 'closed_neutral'
  | 'open'
  | 'other';

const MS_DAY = 24 * 60 * 60 * 1000;
const TERMINAL = new Set(['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED']);
const REOPEN_FROM = new Set(['CLOSED', 'CANCELLED', 'SUCCESS']);

function ts(v: Date | string): number {
  return new Date(v).getTime();
}

function sortedEvents(events: OutcomeEventInput[]) {
  return [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
}

function maxInactivityGapMs(events: OutcomeEventInput[]): number {
  const s = sortedEvents(events);
  let max = 0;
  for (let i = 1; i < s.length; i++) {
    max = Math.max(max, ts(s[i]!.createdAt) - ts(s[i - 1]!.createdAt));
  }
  return max;
}

function reopenCount(events: OutcomeEventInput[]): number {
  return events.filter(
    (e) => e.type === 'STATUS_CHANGED' && e.fromStatus && REOPEN_FROM.has(e.fromStatus),
  ).length;
}

function hadNegotiation(events: OutcomeEventInput[]): boolean {
  return events.some(
    (e) =>
      e.toStatus === 'NEGOTIATION' ||
      e.fromStatus === 'NEGOTIATION' ||
      e.type === 'STATUS_CHANGED' && e.toStatus === 'NEGOTIATION',
  );
}

function touchCount(events: OutcomeEventInput[]): number {
  return events.filter((e) => e.type !== 'CREATED').length;
}

/** Classify terminal/open lead outcome quality. */
export function classifyOutcomeQuality(
  request: OutcomeRequestInput,
  events: OutcomeEventInput[],
): OutcomeClass {
  const status = request.status;
  const s = sortedEvents(events);
  const lifeMs = ts(request.lastActivityAt) - ts(request.createdAt);
  const reopens = reopenCount(s);
  const gapMs = maxInactivityGapMs(s);
  const touches = touchCount(s);
  const transitions = s.filter((e) => e.type === 'STATUS_CHANGED').length;
  const notes = s.filter((e) => e.type === 'NOTE_ADDED').length;

  if (!TERMINAL.has(status)) return 'open';

  if (status === 'SPAM' && lifeMs < MS_DAY) return 'spam_fast';

  if (status === 'SUCCESS' || status === 'COMPLETED') {
    const reopenFromSuccess = s.some(
      (e) => e.type === 'STATUS_CHANGED' && e.fromStatus === 'SUCCESS',
    );
    if (reopenFromSuccess) return 'unstable_success';

    const stages = new Set(extractStageEntries(request, s).map((e) => e.stage));
    const fullPath =
      stages.has('CONTACTED') && stages.has('VIEWING_SCHEDULED') && stages.has('NEGOTIATION');

    if (gapMs >= 3 * MS_DAY && reopens >= 1) return 'recovered_success';
    if (gapMs >= 3 * MS_DAY) return 'recovered_success';

    if (fullPath && reopens === 0 && lifeMs <= 14 * MS_DAY && touches >= 3) {
      return 'healthy_lifecycle';
    }

    if (reopens === 0 && touches >= 2 && lifeMs <= 21 * MS_DAY && notes >= 1) {
      return 'strong_success';
    }

    if (lifeMs > 21 * MS_DAY || touches <= 1 || reopens > 0) return 'weak_success';
    return 'strong_success';
  }

  if (status === 'CLOSED' || status === 'CANCELLED') {
    if (hadNegotiation(s) && !s.some((e) => e.toStatus === 'SUCCESS')) {
      return 'abandoned_negotiation';
    }
    return 'closed_neutral';
  }

  if (transitions >= 4 && lifeMs <= 2 * MS_DAY && notes === 0 && touches >= 3) {
    return 'fake_progression';
  }

  return 'other';
}

export function analyzeOutcomeQualityHints(
  request: OutcomeRequestInput,
  events: OutcomeEventInput[],
): OutcomeQualityHint[] {
  const hints: OutcomeQualityHint[] = [];
  const cls = classifyOutcomeQuality(request, events);
  const s = sortedEvents(events);
  const reopens = reopenCount(s);

  switch (cls) {
    case 'strong_success':
      hints.push({
        code: 'strong_success',
        severity: 'green',
        message: 'Успешно закрыт без reopen',
      });
      break;
    case 'healthy_lifecycle':
      hints.push({
        code: 'healthy_lifecycle',
        severity: 'green',
        message: 'Здоровый lifecycle path',
      });
      break;
    case 'recovered_success':
      hints.push({
        code: 'recovered_success',
        severity: 'green',
        message: 'Лид восстановлен после stale',
      });
      break;
    case 'unstable_success':
      hints.push({
        code: 'unstable_success',
        severity: 'red',
        message: 'Нестабильный SUCCESS',
      });
      break;
    case 'weak_success':
      hints.push({
        code: 'weak_success',
        severity: 'yellow',
        message: 'Слабый SUCCESS — мало касаний или долгий цикл',
      });
      break;
    case 'abandoned_negotiation':
      hints.push({
        code: 'abandoned_negotiation',
        severity: 'red',
        message: 'Переговоры сорвались',
      });
      break;
    case 'spam_fast':
      hints.push({
        code: 'spam_fast',
        severity: 'yellow',
        message: 'Быстрый SPAM',
      });
      break;
    case 'fake_progression':
      hints.push({
        code: 'fake_progression',
        severity: 'red',
        message: 'Подозрение на фиктивную прогрессию',
      });
      break;
    default:
      break;
  }

  if (reopens >= 2 && cls !== 'unstable_success') {
    hints.push({
      code: 'reopen_loop',
      severity: 'red',
      message: `Reopen loop (${reopens}×)`,
    });
  }

  return hints;
}

export type QualityMetrics = {
  sampleSize: number;
  terminalCount: number;
  successCount: number;
  successStabilityPct: number;
  reopenAfterSuccessPct: number;
  negotiationCompletionPct: number;
  fastSpamPct: number;
  healthyLifecyclePct: number;
  recoverySuccessPct: number;
  weakSuccessPct: number;
  fakeProgressionPct: number;
};

export type QualityWarning = {
  code: string;
  label: string;
  severity: QualitySeverity;
};

export type ManagerRecoveryRow = {
  assigneeId: string;
  assigneeName: string;
  recovered: number;
  staleRecoveries: number;
  reopenRecoveries: number;
  negotiationRecoveries: number;
  strongSuccess: number;
};

export type SourceQualityRow = {
  sourceType: AttributionSourceType;
  label: string;
  inflow: number;
  strongSuccess: number;
  unstableSuccess: number;
  fastSpam: number;
  qualityScore: number;
};

export type ConversionQualityAggregate = {
  metrics: QualityMetrics;
  warnings: QualityWarning[];
  managerRecovery: ManagerRecoveryRow[];
  sourceQuality: SourceQualityRow[];
};

function pct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

export function aggregateConversionQuality(
  bundles: Array<{ request: OutcomeRequestInput; events: OutcomeEventInput[] }>,
  assigneeNames: Map<string, string> = new Map(),
): ConversionQualityAggregate {
  let terminalCount = 0;
  let successCount = 0;
  let strongSuccess = 0;
  let unstableSuccess = 0;
  let weakSuccess = 0;
  let recoveredSuccess = 0;
  let healthyLifecycle = 0;
  let fastSpam = 0;
  let fakeProgression = 0;
  let negotiationEntered = 0;
  let negotiationSuccess = 0;
  let reopenAfterSuccess = 0;

  const managerMap = new Map<string, ManagerRecoveryRow>();
  const sourceMap = new Map<AttributionSourceType, SourceQualityRow>();

  for (const { request, events } of bundles) {
    const cls = classifyOutcomeQuality(request, events);
    const attr = classifyRequestAttribution(request);

    if (!sourceMap.has(attr.sourceType)) {
      sourceMap.set(attr.sourceType, {
        sourceType: attr.sourceType,
        label: attr.label,
        inflow: 0,
        strongSuccess: 0,
        unstableSuccess: 0,
        fastSpam: 0,
        qualityScore: 0,
      });
    }
    const src = sourceMap.get(attr.sourceType)!;
    src.inflow += 1;

    if (hadNegotiation(events)) negotiationEntered += 1;

    if (TERMINAL.has(request.status)) {
      terminalCount += 1;
      if (request.status === 'SUCCESS' || request.status === 'COMPLETED') {
        successCount += 1;
        if (hadNegotiation(events)) negotiationSuccess += 1;
        if (sortedEvents(events).some((e) => e.fromStatus === 'SUCCESS')) {
          reopenAfterSuccess += 1;
        }
      }
    }

    if (cls === 'strong_success' || cls === 'healthy_lifecycle') {
      strongSuccess += 1;
      src.strongSuccess += 1;
    }
    if (cls === 'unstable_success') {
      unstableSuccess += 1;
      src.unstableSuccess += 1;
    }
    if (cls === 'weak_success') weakSuccess += 1;
    if (cls === 'recovered_success') recoveredSuccess += 1;
    if (cls === 'healthy_lifecycle') healthyLifecycle += 1;
    if (cls === 'spam_fast') {
      fastSpam += 1;
      src.fastSpam += 1;
    }
    if (cls === 'fake_progression') fakeProgression += 1;

    if (
      (cls === 'recovered_success' || cls === 'strong_success' || cls === 'healthy_lifecycle') &&
      request.assignedTo
    ) {
      const key = request.assignedTo;
      if (!managerMap.has(key)) {
        managerMap.set(key, {
          assigneeId: key,
          assigneeName: assigneeNames.get(key) ?? key,
          recovered: 0,
          staleRecoveries: 0,
          reopenRecoveries: 0,
          negotiationRecoveries: 0,
          strongSuccess: 0,
        });
      }
      const m = managerMap.get(key)!;
      if (cls === 'recovered_success') {
        m.recovered += 1;
        if (reopenCount(events) > 0) m.reopenRecoveries += 1;
        else m.staleRecoveries += 1;
      }
      if (cls === 'strong_success' || cls === 'healthy_lifecycle') m.strongSuccess += 1;
      if (hadNegotiation(events) && cls === 'recovered_success') m.negotiationRecoveries += 1;
    }
  }

  for (const row of sourceMap.values()) {
    row.qualityScore = row.strongSuccess * 2 - row.unstableSuccess * 2 - row.fastSpam;
  }

  const metrics: QualityMetrics = {
    sampleSize: bundles.length,
    terminalCount,
    successCount,
    successStabilityPct: pct(successCount - unstableSuccess, successCount),
    reopenAfterSuccessPct: pct(reopenAfterSuccess, successCount),
    negotiationCompletionPct: pct(negotiationSuccess, negotiationEntered),
    fastSpamPct: pct(fastSpam, terminalCount),
    healthyLifecyclePct: pct(healthyLifecycle, successCount),
    recoverySuccessPct: pct(recoveredSuccess, successCount),
    weakSuccessPct: pct(weakSuccess, successCount),
    fakeProgressionPct: pct(fakeProgression, bundles.length),
  };

  const warnings: QualityWarning[] = [];
  if (metrics.reopenAfterSuccessPct >= 15) {
    warnings.push({
      code: 'unstable_success_elevated',
      label: `Нестабильный SUCCESS: ${metrics.reopenAfterSuccessPct}%`,
      severity: 'red',
    });
  }
  if (metrics.fastSpamPct >= 10) {
    warnings.push({
      code: 'fast_spam_elevated',
      label: `Быстрый SPAM: ${metrics.fastSpamPct}%`,
      severity: 'yellow',
    });
  }
  if (metrics.fakeProgressionPct >= 5) {
    warnings.push({
      code: 'fake_progression',
      label: `Фиктивная прогрессия: ${metrics.fakeProgressionPct}%`,
      severity: 'red',
    });
  }
  if (metrics.negotiationCompletionPct < 40 && negotiationEntered >= 5) {
    warnings.push({
      code: 'negotiation_quality_low',
      label: `Низкое качество переговоров: ${metrics.negotiationCompletionPct}%`,
      severity: 'yellow',
    });
  }

  const managerRecovery = [...managerMap.values()]
    .sort((a, b) => b.recovered - a.recovered || b.strongSuccess - a.strongSuccess)
    .slice(0, 12);

  const sourceQuality = [...sourceMap.values()]
    .sort((a, b) => a.qualityScore - b.qualityScore || b.inflow - a.inflow)
    .slice(0, 10);

  return { metrics, warnings, managerRecovery, sourceQuality };
}
