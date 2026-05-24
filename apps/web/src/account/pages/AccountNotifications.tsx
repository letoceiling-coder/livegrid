import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  payload: { listingId?: number; savedSearchId?: string };
};

export default function AccountNotifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['account', 'notifications'],
    queryFn: () => apiGet<NotificationRow[]>('/account/notifications'),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiPatch(`/account/notifications/${id}/read`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account', 'notifications'] });
      void qc.invalidateQueries({ queryKey: ['account', 'notifications', 'unread'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => apiPost('/account/notifications/read-all', {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['account', 'notifications'] });
      void qc.invalidateQueries({ queryKey: ['account', 'notifications', 'unread'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const rows = data ?? [];
  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} непрочитанных` : 'Все прочитаны'}</p>
        {unread > 0 ? (
          <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => markAll.mutate()}>
            <Check className="w-4 h-4 mr-1" /> Прочитать все
          </Button>
        ) : null}
      </div>

      {!rows.length ? (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Уведомлений пока нет</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li
              key={n.id}
              className={cn(
                'rounded-xl border p-4 text-sm',
                !n.readAt && 'border-primary/30 bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{n.title}</p>
                  {n.body ? <p className="text-muted-foreground text-xs mt-1">{n.body}</p> : null}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString('ru-RU')}
                  </p>
                  {n.payload.listingId ? (
                    <Link
                      to={`/listing/${n.payload.listingId}`}
                      className="text-xs text-primary underline mt-1 inline-block"
                    >
                      Открыть объявление
                    </Link>
                  ) : null}
                </div>
                {!n.readAt ? (
                  <button
                    type="button"
                    className="text-xs text-primary shrink-0 min-h-[44px] px-2"
                    onClick={() => markRead.mutate(n.id)}
                  >
                    Прочитано
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
