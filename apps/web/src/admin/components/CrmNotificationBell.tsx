import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { crmApiGet } from '@/admin/lib/crm-api';
import CrmInlineError from '@/admin/components/CrmInlineError';
import { crmQueryOptions, crmErrorMessage } from '@/admin/lib/crm-query-options';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { CRM_CACHE_OPERATIONAL } from '@/admin/lib/crm-cache-policy';
import { crmInvalidate } from '@/admin/lib/crm-invalidation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  CRM_NOTIFICATION_LABEL,
  CRM_NOTIFICATION_PRIORITY_CLASS,
  formatNotificationTime,
  type CrmNotificationRow,
  type CrmNotificationTypeKey,
} from '@/admin/lib/crm-notifications';
import {
  crmObsNotificationFetch,
  crmObsNotificationRender,
  crmObsUnreadCount,
} from '@/admin/lib/crm-observability';
import { useSmartPollInterval, useCrmPollMeta } from '@/admin/hooks/useSmartPollInterval';

const CRM_ROLES = new Set(['admin', 'editor', 'manager']);

type ListResponse = {
  data: CrmNotificationRow[];
  unreadCount: number;
  meta: { page: number; total: number };
};

export default function CrmNotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const enabled = Boolean(user?.role && CRM_ROLES.has(user.role));
  const pollInterval = useSmartPollInterval('unreadCount');
  const { online } = useCrmPollMeta();

  const unreadQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.notifications.unreadCount,
    queryFn: async () => {
      const t0 = performance.now();
      const res = await crmApiGet<{ count: number }>(
        '/admin/crm-notifications/unread-count',
        'notifications_unread',
      );
      crmObsUnreadCount(performance.now() - t0);
      return res.count;
    },
    ...crmQueryOptions({
      enabled: enabled && online,
      refetchInterval: enabled && pollInterval !== false ? pollInterval : false,
      ...CRM_CACHE_OPERATIONAL,
    }),
  });

  const listQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.notifications.list,
    queryFn: async () => {
      const t0 = performance.now();
      const res = await crmApiGet<ListResponse>(
        '/admin/crm-notifications?per_page=40&page=1',
        'notifications_list',
      );
      crmObsNotificationFetch(performance.now() - t0, res.data.length);
      return res;
    },
    ...crmQueryOptions({
      enabled: enabled && open,
      staleTime: 5_000,
    }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/admin/crm-notifications/${id}/read`, {}),
    onSuccess: () => void crmInvalidate(qc, 'notification_read'),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiPost('/admin/crm-notifications/read-all', {}),
    onSuccess: () => void crmInvalidate(qc, 'notification_read'),
  });

  useEffect(() => {
    if (!open) return;
    const t0 = performance.now();
    requestAnimationFrame(() => crmObsNotificationRender(performance.now() - t0));
  }, [open, listQuery.data]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!enabled) return null;

  const unread = unreadQuery.data ?? 0;
  const items = listQuery.data?.data ?? [];

  const handleOpenItem = (n: CrmNotificationRow) => {
    if (!n.readAt) markReadMutation.mutate(n.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center justify-center w-10 h-10 rounded-xl border bg-background',
          'hover:bg-muted transition-colors motion-safe:transition-colors',
          open && 'ring-2 ring-primary/30',
        )}
        aria-label="Уведомления CRM"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center motion-safe:animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,380px)]',
            'rounded-xl border bg-background shadow-lg overflow-hidden',
            'max-sm:fixed max-sm:right-4 max-sm:left-4 max-sm:w-auto max-sm:top-14',
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <p className="text-sm font-semibold">Уведомления</p>
            <div className="flex items-center gap-1">
              {unread > 0 ? (
                <button
                  type="button"
                  disabled={markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline px-2 py-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Прочитать все
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted md:hidden" aria-label="Закрыть">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain pb-safe">
            {listQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            {listQuery.isError ? (
              <CrmInlineError message="Не удалось загрузить уведомления" className="m-3" />
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Нет уведомлений</p>
            ) : null}

            <ul className="divide-y">
              {items.map((n) => {
                const typeKey = n.type as CrmNotificationTypeKey;
                const href = n.requestId ? `/admin/requests/${n.requestId}` : '/admin/requests';
                return (
                  <li key={n.id}>
                    <Link
                      to={href}
                      onClick={() => handleOpenItem(n)}
                      className={cn(
                        'block px-3 py-3 border-l-4 hover:bg-muted/50 transition-colors',
                        CRM_NOTIFICATION_PRIORITY_CLASS[n.priority] ?? 'border-l-border',
                        !n.readAt && 'bg-primary/5',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium leading-snug', !n.readAt && 'text-foreground')}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatNotificationTime(n.createdAt)}
                        </span>
                      </div>
                      {n.body ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {CRM_NOTIFICATION_LABEL[typeKey] ?? n.type}
                        {n.request ? ` · #${n.request.id}` : ''}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
