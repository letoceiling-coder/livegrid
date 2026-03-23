import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, BedDouble, RefreshCw } from 'lucide-react';
import { listApartments, deleteApartment } from '../../api/apartments';
import { listComplexes } from '../../api/complexes';
import type { CrmApartment, CrmComplex, PaginationMeta } from '../../api/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  reserved:  'bg-amber-100 text-amber-700',
  sold:      'bg-muted text-muted-foreground',
};
const statusLabels: Record<string, string> = {
  available: 'Свободна', reserved: 'Резерв', sold: 'Продана',
};
const roomLabels: Record<number, string> = {
  0: 'Студия', 1: '1-комн.', 2: '2-комн.', 3: '3-комн.', 4: '4-комн.',
};

function formatPrice(p: number) {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)} млн`;
  return `${(p / 1_000).toFixed(0)} тыс.`;
}

export default function ApartmentList() {
  const [items,   setItems]   = useState<CrmApartment[]>([]);
  const [meta,    setMeta]    = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [complexId, setComplexId] = useState('');
  const [rooms,     setRooms]     = useState('');
  const [status,    setStatus]    = useState('');
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);

  const [complexes, setComplexes] = useState<CrmComplex[]>([]);

  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    listComplexes({ per_page: 100 }).then(r => setComplexes(r.data)).catch(() => null);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listApartments({
      complex_id: complexId || undefined,
      rooms: rooms !== '' ? Number(rooms) : undefined,
      status: status || undefined,
      search: search || undefined,
      page,
      per_page: 20,
    })
      .then(r => { setItems(r.data); setMeta(r.meta); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [complexId, rooms, status, search, page]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteApartment(deleteId);
      setDeleteId(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = meta?.pages ?? 1;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Квартиры</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{meta ? `Всего: ${meta.total}` : ''}</p>
        </div>
        <Link
          to="/crm/apartments/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить квартиру
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-background border rounded-2xl p-4 flex flex-wrap gap-3">
        <select
          value={complexId}
          onChange={e => { setComplexId(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-[180px]"
        >
          <option value="">Все комплексы</option>
          {complexes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={rooms}
          onChange={e => { setRooms(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Все типы</option>
          {[0,1,2,3,4].map(r => <option key={r} value={r}>{roomLabels[r]}</option>)}
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Все статусы</option>
          {Object.entries(statusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Номер квартиры…"
            className="pl-9 pr-3 h-9 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button onClick={load} className="h-9 px-3 rounded-xl border hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-background border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <BedDouble className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Ничего не найдено</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ЖК / №</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Тип</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Площадь</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Этаж</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Цена</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.complex ?? '—'}</div>
                    {a.number && <div className="text-xs text-muted-foreground">№ {a.number}</div>}
                  </td>
                  <td className="px-4 py-3">{roomLabels[a.rooms_count] ?? `${a.rooms_count}-комн.`}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a.area_total} м²</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a.floor}{a.floors ? `/${a.floors}` : ''}</td>
                  <td className="px-4 py-3 font-medium">{formatPrice(a.price)} ₽</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-lg text-xs font-medium', statusColors[a.status] ?? 'bg-muted text-muted-foreground')}>
                      {statusLabels[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        to={`/crm/apartments/${a.id}/edit`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-muted disabled:opacity-40 transition-colors">←</button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-muted disabled:opacity-40 transition-colors">→</button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить квартиру?"
        message="Квартира будет удалена из базы данных."
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
