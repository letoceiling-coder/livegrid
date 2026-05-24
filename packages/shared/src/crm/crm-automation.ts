import { SlaState, computeSlaState, type SlaInput } from './request-sla.js';

export enum CrmAutomationRuleType {
  CALLBACK_OVERDUE = 'CALLBACK_OVERDUE',
  STALE_NEGOTIATION = 'STALE_NEGOTIATION',
  NO_REPLY = 'NO_REPLY',
  REOPEN_RISK = 'REOPEN_RISK',
  NEW_VIP_INQUIRY = 'NEW_VIP_INQUIRY',
  SAVED_SEARCH_HOT_LEAD = 'SAVED_SEARCH_HOT_LEAD',
}

export enum CrmFollowupTaskType {
  CALL_CLIENT = 'CALL_CLIENT',
  SEND_REMINDER = 'SEND_REMINDER',
  REVISIT_STALE = 'REVISIT_STALE',
  ESCALATE_NEGOTIATION = 'ESCALATE_NEGOTIATION',
  SCHEDULE_VIEWING = 'SCHEDULE_VIEWING',
  RESCUE_REOPEN = 'RESCUE_REOPEN',
}

export enum CrmFollowupTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISMISSED = 'DISMISSED',
  EXPIRED = 'EXPIRED',
}

export const CRM_AUTOMATION_RULE_LABEL: Record<CrmAutomationRuleType, string> = {
  [CrmAutomationRuleType.CALLBACK_OVERDUE]: 'Просрочен callback',
  [CrmAutomationRuleType.STALE_NEGOTIATION]: 'Застой в переговорах',
  [CrmAutomationRuleType.NO_REPLY]: 'Нет ответа покупателю',
  [CrmAutomationRuleType.REOPEN_RISK]: 'Риск после переоткрытия',
  [CrmAutomationRuleType.NEW_VIP_INQUIRY]: 'VIP-заявка',
  [CrmAutomationRuleType.SAVED_SEARCH_HOT_LEAD]: 'Горячий лид (сохранённый поиск)',
};

export const CRM_FOLLOWUP_TASK_LABEL: Record<CrmFollowupTaskType, string> = {
  [CrmFollowupTaskType.CALL_CLIENT]: 'Позвонить клиенту',
  [CrmFollowupTaskType.SEND_REMINDER]: 'Отправить напоминание',
  [CrmFollowupTaskType.REVISIT_STALE]: 'Вернуться к застойной заявке',
  [CrmFollowupTaskType.ESCALATE_NEGOTIATION]: 'Эскалировать переговоры',
  [CrmFollowupTaskType.SCHEDULE_VIEWING]: 'Назначить просмотр',
  [CrmFollowupTaskType.RESCUE_REOPEN]: 'Спасти переоткрытую сделку',
};

const RULE_TO_TASK: Record<CrmAutomationRuleType, CrmFollowupTaskType> = {
  [CrmAutomationRuleType.CALLBACK_OVERDUE]: CrmFollowupTaskType.CALL_CLIENT,
  [CrmAutomationRuleType.STALE_NEGOTIATION]: CrmFollowupTaskType.ESCALATE_NEGOTIATION,
  [CrmAutomationRuleType.NO_REPLY]: CrmFollowupTaskType.SEND_REMINDER,
  [CrmAutomationRuleType.REOPEN_RISK]: CrmFollowupTaskType.RESCUE_REOPEN,
  [CrmAutomationRuleType.NEW_VIP_INQUIRY]: CrmFollowupTaskType.CALL_CLIENT,
  [CrmAutomationRuleType.SAVED_SEARCH_HOT_LEAD]: CrmFollowupTaskType.SCHEDULE_VIEWING,
};

export function taskTypeForRule(rule: CrmAutomationRuleType): CrmFollowupTaskType {
  return RULE_TO_TASK[rule];
}

export type AutomationEvalInput = {
  requestId: number;
  status: string;
  type: string;
  assignedTo: string | null;
  userId: string | null;
  lastActivityAt: Date | string;
  createdAt: Date | string;
  listingPrice?: number | null;
  hasSavedSearchAlerts?: boolean;
  callbackScheduledAt?: string | null;
  pendingBuyerReply?: boolean;
  pendingReplyHours?: number;
  wasReopenedRecently?: boolean;
};

export type AutomationMatch = {
  ruleType: CrmAutomationRuleType;
  taskType: CrmFollowupTaskType;
  title: string;
  body: string;
  priorityScore: number;
  dueAt?: Date;
};

const TERMINAL = new Set(['SUCCESS', 'CLOSED', 'SPAM', 'COMPLETED', 'CANCELLED']);
const REOPEN_FROM = new Set(['CLOSED', 'CANCELLED']);

export function evaluateAutomationRules(input: AutomationEvalInput, now = new Date()): AutomationMatch[] {
  if (TERMINAL.has(input.status)) return [];

  const matches: AutomationMatch[] = [];
  const sla = computeSlaState(input as SlaInput);

  if (input.callbackScheduledAt) {
    const scheduled = new Date(input.callbackScheduledAt).getTime();
    if (scheduled < now.getTime()) {
      matches.push(buildMatch(CrmAutomationRuleType.CALLBACK_OVERDUE, input, sla, 95, now));
    }
  }

  if (input.status === 'NEGOTIATION' && (sla.slaState === SlaState.STALE || sla.slaState === SlaState.OVERDUE)) {
    matches.push(buildMatch(CrmAutomationRuleType.STALE_NEGOTIATION, input, sla, 85, now));
  }

  if (input.pendingBuyerReply && (input.pendingReplyHours ?? 0) >= 4) {
    const boost = Math.min(15, Math.floor((input.pendingReplyHours ?? 0) / 4));
    matches.push(buildMatch(CrmAutomationRuleType.NO_REPLY, input, sla, 70 + boost, now));
  }

  if (input.wasReopenedRecently) {
    matches.push(buildMatch(CrmAutomationRuleType.REOPEN_RISK, input, sla, 88, now));
  }

  if (
    input.status === 'NEW' &&
    input.assignedTo &&
    (input.type === 'SELECTION' ||
      input.type === 'CALLBACK' ||
      (input.listingPrice != null && input.listingPrice >= 15_000_000))
  ) {
    matches.push(buildMatch(CrmAutomationRuleType.NEW_VIP_INQUIRY, input, sla, 80, now));
  }

  if (input.status === 'NEW' && input.userId && input.hasSavedSearchAlerts && input.assignedTo) {
    matches.push(buildMatch(CrmAutomationRuleType.SAVED_SEARCH_HOT_LEAD, input, sla, 75, now));
  }

  return matches.sort((a, b) => b.priorityScore - a.priorityScore);
}

function buildMatch(
  ruleType: CrmAutomationRuleType,
  input: AutomationEvalInput,
  sla: ReturnType<typeof computeSlaState>,
  baseScore: number,
  now: Date,
): AutomationMatch {
  const taskType = taskTypeForRule(ruleType);
  const label = CRM_AUTOMATION_RULE_LABEL[ruleType];
  const taskLabel = CRM_FOLLOWUP_TASK_LABEL[taskType];
  let priorityScore = baseScore;
  if (sla.slaState === SlaState.OVERDUE) priorityScore = Math.min(100, priorityScore + 10);
  else if (sla.slaState === SlaState.STALE) priorityScore = Math.min(100, priorityScore + 5);

  const dueAt = new Date(now.getTime() + (priorityScore >= 90 ? 2 : 4) * 60 * 60 * 1000);

  return {
    ruleType,
    taskType,
    title: `${taskLabel} · #${input.requestId}`,
    body: `${label}. SLA: ${sla.inactiveLabel}.`,
    priorityScore,
    dueAt,
  };
}

export function detectReopenRecently(
  events: Array<{ type: string; fromStatus: string | null; toStatus: string | null; createdAt: Date | string }>,
  withinHours = 72,
  now = Date.now(),
): boolean {
  const cutoff = now - withinHours * 60 * 60 * 1000;
  return events.some(
    (e) =>
      e.type === 'STATUS_CHANGED' &&
      e.fromStatus &&
      REOPEN_FROM.has(e.fromStatus) &&
      e.toStatus &&
      !TERMINAL.has(e.toStatus) &&
      new Date(e.createdAt).getTime() >= cutoff,
  );
}

export type AutomationMetrics = {
  staleRescueRate: number;
  overdueCallbacks: number;
  followUpCompletionRate: number;
  managerResponsivenessMs: number | null;
  taskPressure: number;
  automationEffectiveness: number;
  tasksCreated24h: number;
  tasksCompleted24h: number;
  runsLast24h: number;
  cooldownSkips: number;
};
