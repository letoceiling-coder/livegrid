import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Trash2 } from 'lucide-react';
import { savedSearchParamsToCatalogUrl, type SavedSearchParamsJson } from '@lg/shared';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import RelatedListingsCarousel from '@/discovery/components/RelatedListingsCarousel';

type SavedSearchRow = {
  id: string;
  name: string;
  paramsJson: SavedSearchParamsJson;
  alertsEnabled: boolean;
  alertNewMatches: boolean;
  lastMatchAt: string | null;
  region: { name: string } | null;
};

function filterChips(params: SavedSearchParamsJson): string[] {
  const p = params.params ?? {};
  const chips: string[] = [];
  if (p.type) chips.push(p.type);
  if (p.search) chips.push(p.search);
  if (p.price_min) chips.push(`от ${Number(p.price_min).toLocaleString('ru-RU')} ₽`);
  if (p.price_max) chips.push(`до ${Number(p.price_max).toLocaleString('ru-RU')} ₽`);
  if (p.rooms) chips.push(`${p.rooms} комн.`);
  if (params.regionId) chips.push(`регион ${params.regionId}`);
  return chips.slice(0, 5);
}

export default function AccountSavedSearches() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['account', 'saved-searches'],
    queryFn: () => apiGet<SavedSearchRow[]>('/account/saved-searches'),
  });

  const toggleAlerts = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiPatch(`/account/saved-searches/${id}`, { alertsEnabled: enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['account', 'saved-searches'] }),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiPatch(`/account/saved-searches/${id}`, { name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['account', 'saved-searches'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/account/saved-searches/${id}`),
    onSuccess: () => {
      toast.success('Поиск удалён');
      void qc.invalidateQueries({ queryKey: ['account', 'saved-searches'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Bell className="w-10 h-10 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Нет сохранённых поисков</p>
        <Link to="/catalog" className="text-sm text-primary underline">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
    <div className="space-y-3">
      {data.map((row) => {
        const chips = filterChips(row.paramsJson);
        const href = savedSearchParamsToCatalogUrl(row.paramsJson);
        return (
          <article key={row.id} className="rounded-2xl border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold text-sm truncate">{row.name}</h2>
                {row.region?.name ? (
                  <p className="text-xs text-muted-foreground">{row.region.name}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive p-2 min-h-[44px] min-w-[44px]"
                onClick={() => {
                  if (confirm('Удалить сохранённый поиск?')) remove.mutate(row.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {chips.length ? (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={row.alertsEnabled}
                  onChange={(e) => toggleAlerts.mutate({ id: row.id, enabled: e.target.checked })}
                />
                Уведомления
              </label>
              <Link
                to={href}
                className="text-xs font-medium text-primary underline min-h-[44px] inline-flex items-center"
              >
                Открыть в каталоге
              </Link>
              <button
                type="button"
                className="text-xs text-muted-foreground underline min-h-[44px]"
                onClick={() => {
                  const next = window.prompt('Новое название', row.name);
                  if (next?.trim()) rename.mutate({ id: row.id, name: next.trim() });
                }}
              >
                Переименовать
              </button>
            </div>
            {row.lastMatchAt ? (
              <p className="text-[10px] text-muted-foreground">
                Последнее совпадение: {new Date(row.lastMatchAt).toLocaleDateString('ru-RU')}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
    <RelatedListingsCarousel
      title="Подходит под ваши поиски"
      fetchUrl="/account/recommendations?per_page=8"
      queryKey={['account', 'recommendations', 'saved-searches-page']}
    />
    </div>
  );
}
