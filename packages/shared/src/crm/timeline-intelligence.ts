/**
 * Derived timeline behavior metrics — no AI, no persistence (Iter 36).
 */

export type TimelineSeverity = 'green' | 'yellow' | 'red';

export type TimelineHint = {
  code: string;
  severity: TimelineSeverity;
  message: string;
};

export type TimelineEventInput = {
  id: number;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  createdAt: Date | string;
  actorId?: string | null;
};

export type RequestTimelineInput = {
  id: number;
  status: string;
  assignedTo: string | null;
  createdAt: Date | string;
  lastActivityAt: Date | string;
};

const TERMINAL = new Set(['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED']);
const REOPEN_FROM = new Set(['CLOSED', 'CANCELLED', 'SUCCESS']);
const TOUCH_TYPES = new Set(['NOTE_ADDED', 'CONTACTED', 'STATUS_CHANGED', 'VIEWING_SCHEDULED', 'ASSIGNED']);

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;

function ts(v: Date | string): number {
  return new Date(v).getTime();
}

function formatDaysHours(ms: number): string {
  const h = Math.floor(ms / MS_HOUR);
  if (h < 48) return `${h} ч`;
  return `${Math.floor(h / 24)} д`;
}

/** Per-request operational hints for detail view. */
export function analyzeRequestTimeline(
  request: RequestTimelineInput,
  events: TimelineEventInput[],
  now = Date.now(),
): TimelineHint[] {
  const hints: TimelineHint[] = [];
  const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));

  const inactiveMs = now - ts(request.lastActivityAt);
  if (!TERMINAL.has(request.status) && inactiveMs >= MS_DAY) {
    hints.push({
      code: 'long_inactivity',
      severity: inactiveMs >= 3 * MS_DAY ? 'red' : 'yellow',
      message: `${formatDaysHours(inactiveMs)} без активности`,
    });
  }

  const assignCount = sorted.filter((e) => e.type === 'ASSIGNED').length;
  if (assignCount >= 3) {
    hints.push({
      code: 'reassignment_churn',
      severity: assignCount >= 4 ? 'red' : 'yellow',
      message: `Частая переадресация (${assignCount}×)`,
    });
  }

  const reopenCount = sorted.filter(
    (e) => e.type === 'STATUS_CHANGED' && e.fromStatus && REOPEN_FROM.has(e.fromStatus),
  ).length;
  if (reopenCount >= 1) {
    hints.push({
      code: 'reopen_loop',
      severity: reopenCount >= 2 ? 'red' : 'yellow',
      message: `Лид reopened ${reopenCount} ${reopenCount === 1 ? 'раз' : reopenCount < 5 ? 'раза' : 'раз'}`,
    });
  }

  const contactedIdx = sorted.findIndex((e) => e.type === 'CONTACTED' || e.toStatus === 'CONTACTED');
  if (contactedIdx >= 0 && !TERMINAL.has(request.status)) {
    const afterContact = sorted.slice(contactedIdx + 1);
    const hasFollowUp = afterContact.some((e) => TOUCH_TYPES.has(e.type) && e.type !== 'ASSIGNED');
    const contactAge = now - ts(sorted[contactedIdx]!.createdAt);
    if (!hasFollowUp && contactAge >= MS_DAY) {
      hints.push({
        code: 'no_followup_after_contact',
        severity: contactAge >= 3 * MS_DAY ? 'red' : 'yellow',
        message: 'После контакта не было действий',
      });
    }
  }

  const noteCount = sorted.filter((e) => e.type === 'NOTE_ADDED').length;
  const pastNew = !['NEW'].includes(request.status) || sorted.some((e) => e.type !== 'CREATED');
  if (pastNew && noteCount === 0 && !TERMINAL.has(request.status)) {
    hints.push({
      code: 'sparse_notes',
      severity: 'yellow',
      message: 'Нет заметок по лиду',
    });
  }

  if (
    ['CONTACTED', 'VIEWING_SCHEDULED', 'NEGOTIATION'].includes(request.status) &&
    inactiveMs >= 2 * MS_DAY
  ) {
    hints.push({
      code: 'overdue_after_contact',
      severity: 'red',
      message: 'Просроченный follow-up после контакта',
    });
  }

  const touchCount = sorted.filter((e) => TOUCH_TYPES.has(e.type)).length;
  if (touchCount >= 3 && inactiveMs < MS_DAY && !TERMINAL.has(request.status)) {
    hints.push({
      code: 'healthy_cadence',
      severity: 'green',
      message: 'Регулярные касания по лиду',
    });
  }

  if (reopenCount === 0 && inactiveMs < MS_DAY && noteCount >= 1) {
    hints.push({
      code: 'note_discipline',
      severity: 'green',
      message: 'Заметки ведутся',
    });
  }

  return hints;
}

export function aggregateQualitySignal(hints: TimelineHint[]): TimelineSeverity {
  if (hints.some((h) => h.severity === 'red')) return 'red';
  if (hints.some((h) => h.severity === 'yellow')) return 'yellow';
  if (hints.some((h) => h.severity === 'green')) return 'green';
  return 'green';
}

export type EventBundle = RequestTimelineInput & {
  events: TimelineEventInput[];
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

function countReopens(events: TimelineEventInput[]): number {
  return events.filter(
    (e) => e.type === 'STATUS_CHANGED' && e.fromStatus && REOPEN_FROM.has(e.fromStatus),
  ).length;
}

function countAssigns(events: TimelineEventInput[]): number {
  return events.filter((e) => e.type === 'ASSIGNED').length;
}

function countNotes(events: TimelineEventInput[]): number {
  return events.filter((e) => e.type === 'NOTE_ADDED').length;
}

function countTouches(events: TimelineEventInput[]): number {
  return events.filter((e) => TOUCH_TYPES.has(e.type)).length;
}

function inactivityGaps(events: TimelineEventInput[]): number[] {
  const sorted = [...events].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(ts(sorted[i]!.createdAt) - ts(sorted[i - 1]!.createdAt));
  }
  return gaps;
}

function firstTouchLatencyMs(events: TimelineEventInput[]): number | null {
  const created = events.find((e) => e.type === 'CREATED');
  if (!created) return null;
  const first = events.find(
    (e) =>
      e.type !== 'CREATED' &&
      (e.type === 'CONTACTED' || e.type === 'NOTE_ADDED' || e.type === 'ASSIGNED'),
  );
  if (!first) return null;
  return ts(first.createdAt) - ts(created.createdAt);
}

function transitionsCount(events: TimelineEventInput[]): number {
  return events.filter((e) => e.type === 'STATUS_CHANGED').length;
}

function isUntouched(events: TimelineEventInput[]): boolean {
  return events.every((e) => e.type === 'CREATED' || e.type === 'ASSIGNED');
}

export type BehaviorMetrics = {
  sampleSize: number;
  medianTouchesBeforeSuccess: number | null;
  avgTransitionsPerLead: number;
  noteDisciplinePct: number;
  assignmentChurnPct: number;
  untouchedLeadPct: number;
  reopenAfterTerminalPct: number;
  medianInactivityGapHours: number | null;
};

export function computeBehaviorMetrics(bundles: EventBundle[]): BehaviorMetrics {
  const n = bundles.length || 1;
  const successBundles = bundles.filter((b) => b.status === 'SUCCESS');
  const touchCountsBeforeSuccess: number[] = [];

  for (const b of successBundles) {
    const successEv = b.events.find((e) => e.type === 'STATUS_CHANGED' && e.toStatus === 'SUCCESS');
    if (!successEv) continue;
    const before = b.events.filter((e) => ts(e.createdAt) <= ts(successEv.createdAt));
    touchCountsBeforeSuccess.push(countTouches(before));
  }

  let reopenFromTerminal = 0;
  let reopenTotal = 0;
  let churnCount = 0;
  let untouched = 0;
  let withNotes = 0;
  let transitionSum = 0;
  const allGaps: number[] = [];

  for (const b of bundles) {
    transitionSum += transitionsCount(b.events);
    if (countAssigns(b.events) > 1) churnCount += 1;
    if (isUntouched(b.events)) untouched += 1;
    if (countNotes(b.events) > 0) withNotes += 1;
    allGaps.push(...inactivityGaps(b.events));
    const reopens = countReopens(b.events);
    reopenTotal += reopens;
    if (reopens > 0 && b.events.some((e) => e.fromStatus === 'SUCCESS')) reopenFromTerminal += 1;
  }

  return {
    sampleSize: bundles.length,
    medianTouchesBeforeSuccess: median(touchCountsBeforeSuccess),
    avgTransitionsPerLead: Math.round((transitionSum / n) * 10) / 10,
    noteDisciplinePct: Math.round((withNotes / n) * 100),
    assignmentChurnPct: Math.round((churnCount / n) * 100),
    untouchedLeadPct: Math.round((untouched / n) * 100),
    reopenAfterTerminalPct:
      reopenTotal > 0 ? Math.round((reopenFromTerminal / reopenTotal) * 100) : 0,
    medianInactivityGapHours: median(allGaps) != null ? Math.round(median(allGaps)! / MS_HOUR) : null,
  };
}

export type ManagerPerformanceRow = {
  assigneeId: string;
  assigneeName: string;
  assignedOpen: number;
  avgFirstTouchMinutes: number | null;
  avgInactivityGapHours: number | null;
  noteCoveragePct: number;
  reassignmentPct: number;
  reopenAfterContactPct: number;
  abandonedPct: number;
  touchesPerLead: number;
  qualitySignal: TimelineSeverity;
};

export function computeManagerPerformance(
  bundles: EventBundle[],
  assigneeNames: Map<string, string>,
  slaOverdueStale: Map<number, 'overdue' | 'stale' | 'ok'>,
): ManagerPerformanceRow[] {
  const byManager = new Map<
    string,
    {
      assignedOpen: number;
      firstTouchMs: number[];
      gapHours: number[];
      withNotes: number;
      reassignLeads: number;
      contactedLeads: number;
      reopenAfterContact: number;
      abandoned: number;
      touchSum: number;
      hints: TimelineHint[];
    }
  >();

  for (const b of bundles) {
    if (!b.assignedTo) continue;
    const key = b.assignedTo;
    if (!byManager.has(key)) {
      byManager.set(key, {
        assignedOpen: 0,
        firstTouchMs: [],
        gapHours: [],
        withNotes: 0,
        reassignLeads: 0,
        contactedLeads: 0,
        reopenAfterContact: 0,
        abandoned: 0,
        touchSum: 0,
        hints: [],
      });
    }
    const m = byManager.get(key)!;
    if (!TERMINAL.has(b.status)) {
      m.assignedOpen += 1;
      const ft = firstTouchLatencyMs(b.events);
      if (ft != null) m.firstTouchMs.push(ft);
      const gapMed = median(inactivityGaps(b.events));
      if (gapMed != null) m.gapHours.push(gapMed / MS_HOUR);
      if (countNotes(b.events) > 0) m.withNotes += 1;
      if (countAssigns(b.events) > 1) m.reassignLeads += 1;
      m.touchSum += countTouches(b.events);
      const contacted = b.events.some((e) => e.type === 'CONTACTED' || e.toStatus === 'CONTACTED');
      if (contacted) {
        m.contactedLeads += 1;
        if (countReopens(b.events) > 0) m.reopenAfterContact += 1;
      }
      const sla = slaOverdueStale.get(b.id);
      if (sla === 'overdue' || sla === 'stale') m.abandoned += 1;
      m.hints.push(...analyzeRequestTimeline(b, b.events));
    }
  }

  return [...byManager.entries()]
    .map(([assigneeId, m]) => {
      const open = m.assignedOpen || 1;
      const qualityHints = m.hints;
      return {
        assigneeId,
        assigneeName: assigneeNames.get(assigneeId) ?? assigneeId,
        assignedOpen: m.assignedOpen,
        avgFirstTouchMinutes:
          median(m.firstTouchMs) != null ? Math.round(median(m.firstTouchMs)! / 60_000) : null,
        avgInactivityGapHours:
          median(m.gapHours) != null ? Math.round(median(m.gapHours)! * 10) / 10 : null,
        noteCoveragePct: Math.round((m.withNotes / open) * 100),
        reassignmentPct: Math.round((m.reassignLeads / open) * 100),
        reopenAfterContactPct:
          m.contactedLeads > 0 ? Math.round((m.reopenAfterContact / m.contactedLeads) * 100) : 0,
        abandonedPct: Math.round((m.abandoned / open) * 100),
        touchesPerLead: Math.round((m.touchSum / open) * 10) / 10,
        qualitySignal: aggregateQualitySignal(qualityHints),
      };
    })
    .filter((r) => r.assignedOpen > 0)
    .sort((a, b) => b.abandonedPct - a.abandonedPct || b.reassignmentPct - a.reassignmentPct);
}

export type AgingHotspot = {
  code: string;
  label: string;
  count: number;
  avgInactivityHours: number;
  severity: TimelineSeverity;
};

export function computeAgingHotspots(
  openRows: Array<{
    id: number;
    status: string;
    inactiveMs: number;
    events?: TimelineEventInput[];
  }>,
): AgingHotspot[] {
  const hotspots: AgingHotspot[] = [];

  const byStatus = new Map<string, { count: number; sumMs: number }>();
  for (const r of openRows) {
    const st = r.status;
    const cur = byStatus.get(st) ?? { count: 0, sumMs: 0 };
    cur.count += 1;
    cur.sumMs += r.inactiveMs;
    byStatus.set(st, cur);
  }

  for (const [status, v] of byStatus) {
    const avgH = Math.round(v.sumMs / v.count / MS_HOUR);
    if (v.count >= 3 && avgH >= 48) {
      hotspots.push({
        code: `aging_${status.toLowerCase()}`,
        label: `Застой в «${status}»`,
        count: v.count,
        avgInactivityHours: avgH,
        severity: avgH >= 120 ? 'red' : 'yellow',
      });
    }
  }

  const negotiationStale = openRows.filter(
    (r) => r.status === 'NEGOTIATION' && r.inactiveMs >= 7 * MS_DAY,
  );
  if (negotiationStale.length > 0) {
    hotspots.push({
      code: 'negotiation_stagnation',
      label: 'Стагнация переговоров',
      count: negotiationStale.length,
      avgInactivityHours: Math.round(
        negotiationStale.reduce((s, r) => s + r.inactiveMs, 0) / negotiationStale.length / MS_HOUR,
      ),
      severity: 'red',
    });
  }

  const viewingUntouched = openRows.filter((r) => {
    if (r.status !== 'VIEWING_SCHEDULED') return false;
    const evs = r.events ?? [];
    const viewingEv = evs.find((e) => e.type === 'VIEWING_SCHEDULED' || e.toStatus === 'VIEWING_SCHEDULED');
    if (!viewingEv) return r.inactiveMs >= 2 * MS_DAY;
    const after = evs.filter((e) => ts(e.createdAt) > ts(viewingEv.createdAt));
    return after.length === 0 && r.inactiveMs >= MS_DAY;
  });
  if (viewingUntouched.length > 0) {
    hotspots.push({
      code: 'viewing_untouched',
      label: 'Просмотр без follow-up',
      count: viewingUntouched.length,
      avgInactivityHours: Math.round(
        viewingUntouched.reduce((s, r) => s + r.inactiveMs, 0) / viewingUntouched.length / MS_HOUR,
      ),
      severity: 'yellow',
    });
  }

  const reopenCycles = openRows.filter((r) => countReopens(r.events ?? []) >= 2);
  if (reopenCycles.length > 0) {
    hotspots.push({
      code: 'reopen_cycles',
      label: 'Повторные reopen',
      count: reopenCycles.length,
      avgInactivityHours: 0,
      severity: 'red',
    });
  }

  return hotspots.sort((a, b) => {
    const sev = { red: 0, yellow: 1, green: 2 };
    return sev[a.severity] - sev[b.severity] || b.count - a.count;
  });
}

export type HygieneSummary = {
  qualityGreen: number;
  qualityYellow: number;
  qualityRed: number;
  reopenHeat: TimelineSeverity;
  topAlerts: string[];
};

export function computeHygieneSummary(
  bundles: EventBundle[],
  slaOverdueStale: Map<number, 'overdue' | 'stale' | 'ok'>,
): HygieneSummary {
  let green = 0;
  let yellow = 0;
  let red = 0;
  const alerts: string[] = [];

  for (const b of bundles) {
    if (TERMINAL.has(b.status)) continue;
    const hints = analyzeRequestTimeline(b, b.events);
    const q = aggregateQualitySignal(hints);
    if (q === 'green') green += 1;
    else if (q === 'yellow') yellow += 1;
    else red += 1;
    for (const h of hints.filter((x) => x.severity === 'red')) {
      if (alerts.length < 5) alerts.push(h.message);
    }
  }

  const reopenTotal = bundles.reduce((s, b) => s + countReopens(b.events), 0);
  const reopenHeat: TimelineSeverity =
    reopenTotal >= 5 ? 'red' : reopenTotal >= 2 ? 'yellow' : 'green';

  const staleCount = [...slaOverdueStale.values()].filter((v) => v !== 'ok').length;
  if (staleCount > 5 && alerts.length < 5) {
    alerts.push(`${staleCount} лидов в SLA-риске`);
  }

  return {
    qualityGreen: green,
    qualityYellow: yellow,
    qualityRed: red,
    reopenHeat,
    topAlerts: alerts,
  };
}
