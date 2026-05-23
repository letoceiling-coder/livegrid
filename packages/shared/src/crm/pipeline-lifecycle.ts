/**
 * Pipeline lifecycle + velocity analytics — deterministic, no AI (Iter 39).
 */

export type LifecycleSeverity = 'green' | 'yellow' | 'red';

export type LifecycleHint = {
  code: string;
  severity: LifecycleSeverity;
  message: string;
};

export type LifecycleEventInput = {
  id: number;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  createdAt: Date | string;
};

export type LifecycleRequestInput = {
  id: number;
  status: string;
  createdAt: Date | string;
  lastActivityAt: Date | string;
};

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const PIPELINE_STAGES = [
  'NEW',
  'IN_PROGRESS',
  'CONTACTED',
  'VIEWING_SCHEDULED',
  'NEGOTIATION',
] as const;

const TERMINAL = new Set(['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED']);
const REOPEN_FROM = new Set(['CLOSED', 'CANCELLED', 'SUCCESS']);

const STAGE_LABEL: Record<string, string> = {
  NEW: 'Новые',
  IN_PROGRESS: 'В работе',
  CONTACTED: 'Связались',
  VIEWING_SCHEDULED: 'Просмотр',
  NEGOTIATION: 'Переговоры',
  SUCCESS: 'Успех',
  CLOSED: 'Закрыты',
  SPAM: 'Спам',
};

export type StageEntry = { stage: string; enteredAt: number };

function ts(v: Date | string): number {
  return new Date(v).getTime();
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

function hours(ms: number): number {
  return Math.round(ms / MS_HOUR);
}

/** Build ordered stage entries from timeline events. */
export function extractStageEntries(
  request: LifecycleRequestInput,
  events: LifecycleEventInput[],
): StageEntry[] {
  const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
  const entries: StageEntry[] = [];
  const seen = new Set<string>();

  const push = (stage: string, at: number) => {
    if (seen.has(stage)) return;
    seen.add(stage);
    entries.push({ stage, enteredAt: at });
  };

  push('NEW', ts(request.createdAt));

  for (const e of sorted) {
    if (e.type === 'CREATED') push('NEW', ts(e.createdAt));
    if (e.type === 'CONTACTED') push('CONTACTED', ts(e.createdAt));
    if (e.type === 'VIEWING_SCHEDULED') push('VIEWING_SCHEDULED', ts(e.createdAt));
    if (e.type === 'STATUS_CHANGED' && e.toStatus) push(e.toStatus, ts(e.createdAt));
  }

  if (!seen.has(request.status) && !TERMINAL.has(request.status)) {
    push(request.status, ts(request.lastActivityAt));
  }

  return entries.sort((a, b) => a.enteredAt - b.enteredAt);
}

export type TransitionLatency = {
  from: string;
  to: string;
  label: string;
  medianHours: number | null;
  sampleSize: number;
};

const VELOCITY_PAIRS: Array<[string, string]> = [
  ['NEW', 'CONTACTED'],
  ['NEW', 'IN_PROGRESS'],
  ['CONTACTED', 'VIEWING_SCHEDULED'],
  ['VIEWING_SCHEDULED', 'NEGOTIATION'],
  ['NEGOTIATION', 'SUCCESS'],
  ['NEW', 'SUCCESS'],
];

export function computeTransitionLatencies(
  bundles: Array<{ request: LifecycleRequestInput; events: LifecycleEventInput[] }>,
): TransitionLatency[] {
  const buckets = new Map<string, number[]>();

  for (const { request, events } of bundles) {
    const entries = extractStageEntries(request, events);
    const byStage = new Map(entries.map((e) => [e.stage, e.enteredAt]));

    for (const [from, to] of VELOCITY_PAIRS) {
      const a = byStage.get(from);
      const b = byStage.get(to);
      if (a == null || b == null || b <= a) continue;
      const key = `${from}->${to}`;
      const list = buckets.get(key) ?? [];
      list.push(b - a);
      buckets.set(key, list);
    }
  }

  return VELOCITY_PAIRS.map(([from, to]) => {
    const values = buckets.get(`${from}->${to}`) ?? [];
    const med = median(values);
    return {
      from,
      to,
      label: `${STAGE_LABEL[from] ?? from} → ${STAGE_LABEL[to] ?? to}`,
      medianHours: med != null ? hours(med) : null,
      sampleSize: values.length,
    };
  }).filter((r) => r.sampleSize > 0);
}

export type StageAgingRow = {
  stage: string;
  label: string;
  count: number;
  medianHoursInStage: number;
};

export function computeStageAging(
  rows: Array<LifecycleRequestInput & { events: LifecycleEventInput[] }>,
  now = Date.now(),
): StageAgingRow[] {
  const buckets = new Map<string, number[]>();

  for (const r of rows) {
    if (TERMINAL.has(r.status)) continue;
    const entries = extractStageEntries(r, r.events);
    const current = entries.filter((e) => e.stage === r.status).pop();
    const entered = current?.enteredAt ?? ts(r.lastActivityAt);
    const ms = now - entered;
    const list = buckets.get(r.status) ?? [];
    list.push(ms);
    buckets.set(r.status, list);
  }

  return PIPELINE_STAGES.map((stage) => {
    const values = buckets.get(stage) ?? [];
    return {
      stage,
      label: STAGE_LABEL[stage] ?? stage,
      count: values.length,
      medianHoursInStage: median(values) != null ? hours(median(values)!) : 0,
    };
  }).filter((r) => r.count > 0);
}

export type LifecycleFriction = {
  code: string;
  label: string;
  count: number;
  severity: LifecycleSeverity;
};

export function detectLifecycleFriction(
  bundles: Array<{ request: LifecycleRequestInput; events: LifecycleEventInput[] }>,
  now = Date.now(),
): LifecycleFriction[] {
  const frictions: LifecycleFriction[] = [];
  let viewingAbandon = 0;
  let negotiationStagnation = 0;
  let reopenAfterSuccess = 0;
  let reassignBeforeContact = 0;
  let staleAfterViewing = 0;
  let earlySpam = 0;

  for (const { request, events } of bundles) {
    const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    const entries = extractStageEntries(request, events);
    const byStage = new Map(entries.map((e) => [e.stage, e.enteredAt]));

    if (
      request.status === 'SPAM' &&
      ts(request.createdAt) &&
      ts(sorted[sorted.length - 1]?.createdAt ?? request.createdAt) - ts(request.createdAt) < MS_DAY
    ) {
      earlySpam += 1;
    }

    const reopenSuccess = sorted.some(
      (e) => e.type === 'STATUS_CHANGED' && e.fromStatus === 'SUCCESS',
    );
    if (reopenSuccess) reopenAfterSuccess += 1;

    const reopenLoops = sorted.filter(
      (e) => e.type === 'STATUS_CHANGED' && e.fromStatus && REOPEN_FROM.has(e.fromStatus),
    ).length;
    if (reopenLoops >= 2) {
      /* counted in reopen aggregate */
    }

    const contactedAt = byStage.get('CONTACTED');
    const viewingAt = byStage.get('VIEWING_SCHEDULED');
    const assignedBeforeContact = sorted.find(
      (e) => e.type === 'ASSIGNED' && contactedAt != null && ts(e.createdAt) < contactedAt,
    );
    const assignCount = sorted.filter((e) => e.type === 'ASSIGNED').length;
    if (assignCount > 1 && !contactedAt) reassignBeforeContact += 1;
    else if (assignedBeforeContact && assignCount > 1) reassignBeforeContact += 1;

    if (contactedAt && !viewingAt && request.status === 'CONTACTED' && now - contactedAt > 3 * MS_DAY) {
      /* no viewing hint handled in per-request */
    }

    if (viewingAt && ['CLOSED', 'SPAM', 'CANCELLED'].includes(request.status)) {
      const hadNegotiation = byStage.has('NEGOTIATION');
      if (!hadNegotiation) viewingAbandon += 1;
    }

    if (request.status === 'NEGOTIATION') {
      const negAt = byStage.get('NEGOTIATION') ?? ts(request.lastActivityAt);
      if (now - negAt >= 7 * MS_DAY) negotiationStagnation += 1;
    }

    if (viewingAt && !TERMINAL.has(request.status)) {
      const inactive = now - ts(request.lastActivityAt);
      if (inactive >= 2 * MS_DAY) staleAfterViewing += 1;
    }
  }

  if (viewingAbandon > 0) {
    frictions.push({
      code: 'viewing_abandon',
      label: 'Отказ после просмотра без переговоров',
      count: viewingAbandon,
      severity: viewingAbandon >= 3 ? 'red' : 'yellow',
    });
  }
  if (negotiationStagnation > 0) {
    frictions.push({
      code: 'negotiation_stagnation',
      label: 'Стагнация в переговорах (7д+)',
      count: negotiationStagnation,
      severity: 'red',
    });
  }
  if (reopenAfterSuccess > 0) {
    frictions.push({
      code: 'reopen_after_success',
      label: 'Reopen после SUCCESS',
      count: reopenAfterSuccess,
      severity: reopenAfterSuccess >= 2 ? 'red' : 'yellow',
    });
  }
  if (reassignBeforeContact > 0) {
    frictions.push({
      code: 'reassign_before_contact',
      label: 'Переадресация до контакта',
      count: reassignBeforeContact,
      severity: 'yellow',
    });
  }
  if (staleAfterViewing > 0) {
    frictions.push({
      code: 'stale_after_viewing',
      label: 'Застой после просмотра',
      count: staleAfterViewing,
      severity: 'yellow',
    });
  }
  if (earlySpam > 0) {
    frictions.push({
      code: 'early_spam',
      label: 'Быстрый выход в SPAM',
      count: earlySpam,
      severity: 'yellow',
    });
  }

  return frictions.sort((a, b) => {
    const sev = { red: 0, yellow: 1, green: 2 };
    return sev[a.severity] - sev[b.severity] || b.count - a.count;
  });
}

export type SuccessPathMetrics = {
  count: number;
  medianLifecycleDays: number | null;
  medianTouches: number | null;
  medianTransitions: number | null;
};

export function computeSuccessPathMetrics(
  bundles: Array<{ request: LifecycleRequestInput; events: LifecycleEventInput[] }>,
): SuccessPathMetrics {
  const durations: number[] = [];
  const touches: number[] = [];
  const transitions: number[] = [];

  for (const { request, events } of bundles) {
    if (request.status !== 'SUCCESS' && request.status !== 'COMPLETED') continue;
    const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    const successEv = sorted.find((e) => e.type === 'STATUS_CHANGED' && e.toStatus === 'SUCCESS');
    const end = successEv ? ts(successEv.createdAt) : ts(request.lastActivityAt);
    durations.push(end - ts(request.createdAt));
    touches.push(sorted.filter((e) => e.type !== 'CREATED').length);
    transitions.push(sorted.filter((e) => e.type === 'STATUS_CHANGED').length);
  }

  const med = median(durations);
  return {
    count: durations.length,
    medianLifecycleDays: med != null ? Math.round(med / MS_DAY) : null,
    medianTouches: median(touches),
    medianTransitions: median(transitions),
  };
}

/** Per-request lifecycle hints for detail view. */
export function analyzeLifecycleHints(
  request: LifecycleRequestInput,
  events: LifecycleEventInput[],
  now = Date.now(),
): LifecycleHint[] {
  const hints: LifecycleHint[] = [];
  const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
  const entries = extractStageEntries(request, events);
  const byStage = new Map(entries.map((e) => [e.stage, e.enteredAt]));

  if (request.status === 'NEGOTIATION') {
    const negAt = byStage.get('NEGOTIATION') ?? ts(request.lastActivityAt);
    const ms = now - negAt;
    if (ms >= 7 * MS_DAY) {
      hints.push({
        code: 'long_negotiation',
        severity: 'red',
        message: `Слишком долго в переговорах (${Math.floor(ms / MS_DAY)} д)`,
      });
    } else if (ms >= 3 * MS_DAY) {
      hints.push({
        code: 'long_negotiation',
        severity: 'yellow',
        message: `Долго в NEGOTIATION (${Math.floor(ms / MS_DAY)} д)`,
      });
    }
  }

  const reopenSuccess = sorted.some(
    (e) => e.type === 'STATUS_CHANGED' && e.fromStatus === 'SUCCESS',
  );
  if (reopenSuccess) {
    hints.push({
      code: 'reopen_after_success',
      severity: 'red',
      message: 'Переоткрыт после SUCCESS',
    });
  }

  const contactedAt = byStage.get('CONTACTED');
  const viewingAt = byStage.get('VIEWING_SCHEDULED');
  if (contactedAt && !viewingAt && ['CONTACTED', 'IN_PROGRESS'].includes(request.status)) {
    if (now - contactedAt >= 3 * MS_DAY) {
      hints.push({
        code: 'no_viewing_after_contact',
        severity: 'yellow',
        message: 'Нет VIEWING после CONTACTED',
      });
    }
  }

  if (request.status === 'SPAM') {
    const span = ts(request.lastActivityAt) - ts(request.createdAt);
    if (span < MS_DAY) {
      hints.push({
        code: 'fast_spam',
        severity: 'yellow',
        message: 'Быстрое закрытие как SPAM',
      });
    }
  }

  if (request.status === 'SUCCESS' || request.status === 'COMPLETED') {
    const duration = ts(request.lastActivityAt) - ts(request.createdAt);
    if (duration <= 14 * MS_DAY) {
      hints.push({
        code: 'success_path',
        severity: 'green',
        message: 'Успешный lifecycle path',
      });
    }
  }

  const reopenCount = sorted.filter(
    (e) => e.type === 'STATUS_CHANGED' && e.fromStatus && REOPEN_FROM.has(e.fromStatus),
  ).length;
  if (reopenCount >= 2) {
    hints.push({
      code: 'reopen_loop',
      severity: 'red',
      message: `Reopen loop (${reopenCount}×)`,
    });
  }

  return hints;
}

export type PipelineLifecycleAggregate = {
  transitionLatencies: TransitionLatency[];
  stageAging: StageAgingRow[];
  friction: LifecycleFriction[];
  successPath: SuccessPathMetrics;
  avgLifecycleHours: number | null;
};

export function aggregatePipelineLifecycle(
  bundles: Array<{ request: LifecycleRequestInput; events: LifecycleEventInput[] }>,
  openRows: Array<LifecycleRequestInput & { events: LifecycleEventInput[] }>,
  now = Date.now(),
): PipelineLifecycleAggregate {
  const transitionLatencies = computeTransitionLatencies(bundles);
  const stageAging = computeStageAging(openRows, now);
  const friction = detectLifecycleFriction(bundles, now);
  const successPath = computeSuccessPathMetrics(bundles);

  const lifecycleMs: number[] = [];
  for (const { request, events } of bundles) {
    if (!TERMINAL.has(request.status)) continue;
    const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    const last = sorted[sorted.length - 1];
    if (last) lifecycleMs.push(ts(last.createdAt) - ts(request.createdAt));
  }

  const medLife = median(lifecycleMs);
  return {
    transitionLatencies,
    stageAging,
    friction,
    successPath,
    avgLifecycleHours: medLife != null ? hours(medLife) : null,
  };
}
