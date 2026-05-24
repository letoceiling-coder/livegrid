import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquare } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { crmQueryOptions } from '@/admin/lib/crm-query-options';
import { CRM_THREAD_TYPE_LABEL } from '@lg/shared';

type ConversationRow = {
  threadId: number;
  requestId: number | null;
  threadType: string;
  subject: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  unread: boolean;
  pendingReply: boolean;
  callbackOverdue: boolean;
  stale: boolean;
  request: {
    id: number;
    name: string | null;
    phone: string | null;
    status: string;
  } | null;
  lastMessage: { body: string; type: string; createdAt: string } | null;
};

type Filter = 'all' | 'pending' | 'callbacks';

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'сейчас';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
  return d.toLocaleDateString('ru-RU');
}

function ConversationList({ filter }: { filter: Filter }) {
  const query = useQuery({
    queryKey: CRM_QUERY_KEYS.communication.inbox(filter),
    queryFn: () => apiGet<ConversationRow[]>(`/admin/crm/communication/conversations?filter=${filter}`),
    ...crmQueryOptions({ staleTime: 20_000 }),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Загрузка…
      </div>
    );
  }

  const rows = query.data ?? [];

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Нет активных переписок</p>;
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((row) => {
        const href = row.requestId ? `/admin/requests/${row.requestId}` : '#';
        const label =
          row.request?.name?.trim() ||
          row.request?.phone?.trim() ||
          row.subject ||
          `Тред #${row.threadId}`;
        return (
          <li key={row.threadId}>
            <Link
              to={href}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-muted/40 transition-colors min-h-[56px] touch-manipulation',
                row.unread && 'bg-primary/5',
              )}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <MessageSquare className={cn('w-4 h-4 mt-0.5 shrink-0', row.unread ? 'text-primary' : 'text-muted-foreground')} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium truncate', row.unread && 'text-primary')}>{label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {CRM_THREAD_TYPE_LABEL[row.threadType as keyof typeof CRM_THREAD_TYPE_LABEL] ?? row.threadType}
                    {row.lastMessage ? ` · ${row.lastMessage.body.slice(0, 80)}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {row.pendingReply ? (
                      <span className="text-[10px] rounded-full bg-amber-500/15 text-amber-800 px-2 py-0.5">Ждёт ответа</span>
                    ) : null}
                    {row.callbackOverdue ? (
                      <span className="text-[10px] rounded-full bg-red-500/15 text-red-700 px-2 py-0.5">Callback</span>
                    ) : null}
                    {row.stale ? (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5">Застой</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 pl-7 sm:pl-0 text-right">
                {formatRelative(row.lastMessageAt)}
                <span className="block">{row.messageCount} сообщ.</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminConversationsPage() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') as Filter) || 'all';

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-xl font-bold">Переписки</h1>
        <p className="text-sm text-muted-foreground">Операционный inbox — не мессенджер</p>
      </header>
      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            ['all', 'Все'],
            ['pending', 'Ждут ответа'],
            ['callbacks', 'Callback'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setParams({ filter: key })}
            className={cn(
              'rounded-full px-3 py-1.5 border min-h-[36px] touch-manipulation',
              filter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <ConversationList filter={filter} />
    </div>
  );
}
