import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Trash2, X } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

type HistoryRow = {
  id: string;
  entityKind: string;
  entityId: number;
  title: string | null;
  viewedAt: string;
};

function entityHref(row: HistoryRow): string {
  if (row.entityKind === 'BLOCK') return `/complex/${row.entityId}`;
  return `/listing/${row.entityId}`;
}

export default function AccountHistory() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['account', 'history'],
    queryFn: () => apiGet<HistoryRow[]>('/account/history'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/account/history/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['account', 'history'] }),
  });

  const clear = useMutation({
    mutationFn: () => apiDelete('/account/history'),
    onSuccess: () => {
      toast.success('История очищена');
      void qc.invalidateQueries({ queryKey: ['account', 'history'] });
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

  if (!rows.length) {
    return (
      <div className="text-center py-16 space-y-2">
        <Clock className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Вы ещё не просматривали объекты</p>
        <Link to="/catalog" className="text-sm text-primary underline">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={() => {
            if (confirm('Очистить всю историю?')) clear.mutate();
          }}
        >
          <Trash2 className="w-4 h-4 mr-1" /> Очистить
        </Button>
      </div>
      <ul className="divide-y rounded-2xl border overflow-hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-2 p-3 bg-card hover:bg-muted/30">
            <Link to={entityHref(row)} className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{row.title ?? `#${row.entityId}`}</p>
              <p className="text-[10px] text-muted-foreground">
                {row.entityKind === 'BLOCK' ? 'ЖК' : 'Объявление'} ·{' '}
                {new Date(row.viewedAt).toLocaleString('ru-RU')}
              </p>
            </Link>
            <button
              type="button"
              className="p-2 text-muted-foreground hover:text-destructive min-h-[44px] min-w-[44px]"
              onClick={() => remove.mutate(row.id)}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Record browse event (guest local + authenticated server). Re-export for callers. */
export { recordBrowseHistory } from '@/shared/lib/record-browse-history';
