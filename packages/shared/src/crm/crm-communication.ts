export enum CrmThreadType {
  LISTING_INQUIRY = 'LISTING_INQUIRY',
  COMPLEX_INQUIRY = 'COMPLEX_INQUIRY',
  SUPPORT = 'SUPPORT',
  INTERNAL = 'INTERNAL',
}

export enum CrmMessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  NOTE = 'NOTE',
  CONTACT_ATTEMPT = 'CONTACT_ATTEMPT',
  CALLBACK_SCHEDULED = 'CALLBACK_SCHEDULED',
}

export enum CrmMessageVisibility {
  INTERNAL = 'INTERNAL',
  BUYER_VISIBLE = 'BUYER_VISIBLE',
  MANAGER_ONLY = 'MANAGER_ONLY',
}

export enum CrmParticipantRole {
  BUYER = 'BUYER',
  AGENT = 'AGENT',
  MANAGER = 'MANAGER',
  SYSTEM = 'SYSTEM',
}

export const CRM_THREAD_TYPE_LABEL: Record<CrmThreadType, string> = {
  [CrmThreadType.LISTING_INQUIRY]: 'Запрос по объекту',
  [CrmThreadType.COMPLEX_INQUIRY]: 'Запрос по ЖК',
  [CrmThreadType.SUPPORT]: 'Поддержка',
  [CrmThreadType.INTERNAL]: 'Внутреннее обсуждение',
};

export const CRM_MESSAGE_TYPE_LABEL: Record<CrmMessageType, string> = {
  [CrmMessageType.TEXT]: 'Сообщение',
  [CrmMessageType.SYSTEM]: 'Система',
  [CrmMessageType.NOTE]: 'Заметка',
  [CrmMessageType.CONTACT_ATTEMPT]: 'Контакт',
  [CrmMessageType.CALLBACK_SCHEDULED]: 'Обратный звонок',
};

export type CrmCallbackMeta = {
  scheduledAt: string;
  channel?: string;
  overdue?: boolean;
};

export type CrmCommunicationMetrics = {
  activeThreads: number;
  unreadConversations: number;
  avgReplyLatencyMs: number | null;
  staleConversations: number;
  callbackOverdueCount: number;
};

const STALE_CONVERSATION_MS = 48 * 60 * 60 * 1000;

export type ThreadActivityInput = {
  lastMessageAt: string | Date | null;
  lastStaffReplyAt?: string | Date | null;
  status?: string;
};

export function isStaleConversation(input: ThreadActivityInput, now = Date.now()): boolean {
  const last = input.lastMessageAt ? new Date(input.lastMessageAt).getTime() : 0;
  if (!last) return false;
  const open = !input.status || !['CLOSED', 'CANCELLED'].includes(input.status);
  return open && now - last > STALE_CONVERSATION_MS;
}

export function computeAvgReplyLatencyMs(
  pairs: Array<{ buyerAt: number; staffAt: number }>,
): number | null {
  if (pairs.length === 0) return null;
  const total = pairs.reduce((sum, p) => sum + Math.max(0, p.staffAt - p.buyerAt), 0);
  return Math.round(total / pairs.length);
}

export function extractMentionedUserIds(body: string): string[] {
  const matches = body.match(/@([0-9a-f-]{36})/gi) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
