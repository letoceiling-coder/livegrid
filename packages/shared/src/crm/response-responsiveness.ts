/** Marketplace responsiveness scoring — heuristic only, no AI. */

export type ResponseVelocityInput = {
  open: number;
  overdue: number;
  stale: number;
  unassignedOpen: number;
  avgFirstContactMinutes: number | null;
  avgAssignmentMinutes: number | null;
  callbackOverdueCount: number;
  staleThreads: number;
  unreadThreads: number;
  moderationStaleReview: number;
};

export function computeResponseSlaScore(input: ResponseVelocityInput): number {
  if (input.open === 0) return 100;
  const overdueRatio = input.overdue / input.open;
  const staleRatio = input.stale / input.open;
  let penalty = overdueRatio * 120 + staleRatio * 60;
  penalty += Math.min(15, input.callbackOverdueCount * 2);
  penalty += Math.min(10, input.staleThreads * 0.5);
  penalty += Math.min(10, input.unassignedOpen * 0.3);
  penalty += Math.min(8, input.moderationStaleReview * 0.5);
  if (input.avgFirstContactMinutes != null && input.avgFirstContactMinutes > 240) {
    penalty += Math.min(12, (input.avgFirstContactMinutes - 240) / 60);
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export type PublicResponsivenessHint = {
  show: boolean;
  label: string;
  expectation: string;
};

/** Positive-only public copy — never expose slow agents or SLA failures. */
export function publicResponsivenessHint(input: {
  avgFirstContactMinutes: number | null;
  avgReplyMinutes: number | null;
}): PublicResponsivenessHint | null {
  const first = input.avgFirstContactMinutes;
  const reply = input.avgReplyMinutes;

  const fastFirst = first != null && first <= 120;
  const fastReply = reply != null && reply <= 90;

  if (!fastFirst && !fastReply) return null;

  return {
    show: true,
    label: fastFirst && fastReply ? 'Обычно отвечаем быстро' : 'Менеджеры на связи',
    expectation:
      'Оставьте заявку — свяжемся в рабочее время, обычно в течение нескольких часов. Точное время зависит от загрузки.',
  };
}

export function agentResponseTier(input: {
  assigned: number;
  overdue: number;
  stale: number;
}): 'fast' | 'balanced' | 'attention' {
  if (input.assigned === 0) return 'balanced';
  const pressure = (input.overdue + input.stale) / input.assigned;
  if (pressure <= 0.15) return 'fast';
  if (pressure >= 0.4) return 'attention';
  return 'balanced';
}
