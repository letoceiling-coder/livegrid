import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2, MessageSquare, PhoneCall, Send, StickyNote } from 'lucide-react';
import { ApiError, apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { crmQueryOptions } from '@/admin/lib/crm-query-options';
import { crmInvalidate } from '@/admin/lib/crm-invalidation';
import { crmObsCommunicationFetch } from '@/admin/lib/crm-observability';
import {
  CRM_MESSAGE_TYPE_LABEL,
  type CrmCallbackMeta,
} from '@lg/shared';

type Actor = { id: string; fullName: string | null; email: string | null; role: string };

type CommMessage = {
  id: number;
  type: string;
  visibility: string;
  body: string;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: Actor | null;
};

type CommThread = {
  id: number;
  threadType: string;
  messageCount: number;
  lastMessageAt: string | null;
};

type CommunicationPayload = {
  thread: CommThread;
  messages: CommMessage[];
  interactionCount: number;
  stale: boolean;
  callbackOverdueCount: number;
};

function parseError(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.message) as { message?: string };
      if (j.message) return String(j.message);
    } catch {
      return e.message;
    }
  }
  return e instanceof Error ? e.message : 'Ошибка';
}

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function isCallbackOverdue(meta: Record<string, unknown>): boolean {
  const at = (meta as CrmCallbackMeta)?.scheduledAt;
  if (!at) return false;
  return new Date(at).getTime() < Date.now();
}

type Props = {
  requestId: number;
  className?: string;
};

export default function RequestCommunicationPanel({ requestId, className }: Props) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const [tab, setTab] = useState<'thread' | 'notes' | 'ops'>('thread');

  const commQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.communication.request(requestId),
    queryFn: async () => {
      const t0 = performance.now();
      const data = await apiGet<CommunicationPayload>(`/admin/requests/${requestId}/communication`);
      crmObsCommunicationFetch(performance.now() - t0);
      return data;
    },
    ...crmQueryOptions({ staleTime: 15_000 }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: CRM_QUERY_KEYS.communication.request(requestId) });
    void qc.invalidateQueries({ queryKey: CRM_QUERY_KEYS.requests.detail(requestId) });
    void crmInvalidate(qc, 'request_mutation');
  };

  const messageMutation = useMutation({
    mutationFn: (payload: { body: string; type?: string; visibility?: string }) =>
      apiPost(`/admin/requests/${requestId}/communication/messages`, payload),
    onSuccess: () => {
      setDraft('');
      setManagerNote('');
      invalidate();
    },
  });

  const contactMutation = useMutation({
    mutationFn: (body: string) => apiPost(`/admin/requests/${requestId}/communication/contact`, { body }),
    onSuccess: () => {
      setContactNote('');
      invalidate();
    },
  });

  const callbackMutation = useMutation({
    mutationFn: (payload: { scheduledAt: string; note?: string }) =>
      apiPost(`/admin/requests/${requestId}/communication/callback`, payload),
    onSuccess: () => {
      setCallbackAt('');
      invalidate();
    },
  });

  const messages = commQuery.data?.messages ?? [];
  const callbacks = useMemo(
    () => messages.filter((m) => m.type === 'CALLBACK_SCHEDULED'),
    [messages],
  );

  const pendingReplyHint = useMemo(() => {
    let lastBuyerAt: number | null = null;
    let lastStaffAt: number | null = null;
    for (const m of messages) {
      if (m.type === 'TEXT' && !m.actor) lastBuyerAt = new Date(m.createdAt).getTime();
      if (m.actor) lastStaffAt = new Date(m.createdAt).getTime();
    }
    if (lastBuyerAt == null) return null;
    if (lastStaffAt != null && lastStaffAt >= lastBuyerAt) return null;
    const ageMs = Date.now() - lastBuyerAt;
    const mins = Math.floor(ageMs / 60_000);
    if (mins < 15) return null;
    const label = mins < 60 ? `${mins} мин` : `${Math.floor(mins / 60)} ч`;
    return `Клиент ждёт ответа · ${label}`;
  }, [messages]);

  if (commQuery.isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-muted-foreground', className)}>
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Загрузка переписки…
      </div>
    );
  }

  if (commQuery.isError) {
    return (
      <p className={cn('text-sm text-destructive', className)}>
        {parseError(commQuery.error)}
      </p>
    );
  }

  const data = commQuery.data!;

  return (
    <section className={cn('rounded-xl border bg-card flex flex-col min-h-[320px] max-sm:min-h-[360px]', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
        <MessageSquare className="w-4 h-4 text-primary shrink-0" />
        <h2 className="font-semibold text-sm flex-1">Коммуникация</h2>
        <span className="text-xs text-muted-foreground">{data.interactionCount} касаний</span>
        {data.stale ? (
          <span className="rounded-full bg-amber-500/15 text-amber-800 text-[10px] px-2 py-0.5 font-medium">Застой</span>
        ) : null}
        {data.callbackOverdueCount > 0 ? (
          <span className="rounded-full bg-red-500/15 text-red-700 text-[10px] px-2 py-0.5 font-medium">
            Callback +{data.callbackOverdueCount}
          </span>
        ) : null}
        {pendingReplyHint ? (
          <span className="rounded-full bg-amber-500/15 text-amber-900 text-[10px] px-2 py-0.5 font-medium">
            {pendingReplyHint}
          </span>
        ) : null}
      </div>

      <div className="flex border-b text-xs">
        {(['thread', 'notes', 'ops'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 py-2.5 font-medium transition-colors min-h-[44px]',
              tab === key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground',
            )}
          >
            {key === 'thread' ? 'Тред' : key === 'notes' ? 'Заметки' : 'Операции'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 space-y-3 max-h-[420px]">
        {tab === 'thread' &&
          messages.map((m) => (
            <article
              key={m.id}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                m.visibility === 'MANAGER_ONLY' && 'border-violet-500/30 bg-violet-500/5',
                m.type === 'CALLBACK_SCHEDULED' && isCallbackOverdue(m.meta) && 'border-red-500/40 bg-red-500/5',
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mb-1">
                <span className="font-medium text-foreground">
                  {CRM_MESSAGE_TYPE_LABEL[m.type as keyof typeof CRM_MESSAGE_TYPE_LABEL] ?? m.type}
                </span>
                <span>{formatDt(m.createdAt)}</span>
                {m.actor ? <span>{m.actor.fullName ?? m.actor.email}</span> : m.type === 'TEXT' ? <span>Покупатель</span> : null}
              </div>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              {m.type === 'CALLBACK_SCHEDULED' && (m.meta as CrmCallbackMeta)?.scheduledAt ? (
                <p className={cn('text-xs mt-1 flex items-center gap-1', isCallbackOverdue(m.meta) ? 'text-red-600' : 'text-muted-foreground')}>
                  <CalendarClock className="w-3 h-3" />
                  {formatDt((m.meta as CrmCallbackMeta).scheduledAt)}
                </p>
              ) : null}
            </article>
          ))}

        {tab === 'notes' &&
          messages
            .filter((m) => m.type === 'NOTE' || m.visibility === 'MANAGER_ONLY')
            .map((m) => (
              <article key={m.id} className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm">
                <p className="text-[11px] text-muted-foreground mb-1">{formatDt(m.createdAt)}</p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </article>
            ))}

        {tab === 'ops' && (
          <div className="space-y-2">
            {callbacks.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm flex items-center gap-2',
                  isCallbackOverdue(c.meta) ? 'border-red-500/40 bg-red-500/5' : 'border-border',
                )}
              >
                <CalendarClock className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-medium text-xs">{formatDt((c.meta as CrmCallbackMeta).scheduledAt ?? c.createdAt)}</p>
                  <p className="text-muted-foreground text-xs">{c.body}</p>
                </div>
              </div>
            ))}
            {messages
              .filter((m) => m.type === 'CONTACT_ATTEMPT')
              .map((m) => (
                <div key={m.id} className="rounded-lg border px-3 py-2 text-sm flex gap-2">
                  <PhoneCall className="w-4 h-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">{formatDt(m.createdAt)}</p>
                    <p>{m.body}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur px-3 py-3 sm:px-4 space-y-2">
        {tab === 'thread' && (
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Ответ или сообщение…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm resize-none min-h-[44px]"
            />
            <button
              type="button"
              disabled={!draft.trim() || messageMutation.isPending}
              onClick={() =>
                messageMutation.mutate({ body: draft.trim(), type: 'TEXT', visibility: 'BUYER_VISIBLE' })
              }
              className="shrink-0 h-11 w-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 touch-manipulation"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
        {tab === 'notes' && (
          <div className="flex gap-2">
            <textarea
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              rows={2}
              placeholder="Внутренняя заметка (@uuid для упоминания)…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm resize-none min-h-[44px]"
            />
            <button
              type="button"
              disabled={!managerNote.trim() || messageMutation.isPending}
              onClick={() =>
                messageMutation.mutate({
                  body: managerNote.trim(),
                  type: 'NOTE',
                  visibility: 'MANAGER_ONLY',
                })
              }
              className="shrink-0 h-11 w-11 rounded-lg bg-violet-600 text-white flex items-center justify-center disabled:opacity-50 touch-manipulation"
            >
              <StickyNote className="w-4 h-4" />
            </button>
          </div>
        )}
        {tab === 'ops' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <input
                type="datetime-local"
                value={callbackAt}
                onChange={(e) => setCallbackAt(e.target.value)}
                className="w-full h-11 rounded-lg border px-3 text-sm"
              />
              <button
                type="button"
                disabled={!callbackAt || callbackMutation.isPending}
                onClick={() =>
                  callbackMutation.mutate({
                    scheduledAt: new Date(callbackAt).toISOString(),
                  })
                }
                className="w-full h-11 rounded-lg border text-sm font-medium touch-manipulation"
              >
                Запланировать звонок
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                placeholder="Контакт: исход, результат…"
                className="flex-1 h-11 rounded-lg border px-3 text-sm"
              />
              <button
                type="button"
                disabled={!contactNote.trim() || contactMutation.isPending}
                onClick={() => contactMutation.mutate(contactNote.trim())}
                className="shrink-0 h-11 px-3 rounded-lg bg-primary text-primary-foreground text-sm touch-manipulation"
              >
                Контакт
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
