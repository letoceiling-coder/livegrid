import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Building2, MapPin, RefreshCw } from 'lucide-react';
import { listComplexes, deleteComplex } from '../../api/complexes';
import { listBuilders, listDistricts } from '../../api/attributes';
import type { CrmComplex, CrmBuilder, CrmDistrict, PaginationMeta } from '../../api/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  selling: 'bg-primary/10 text-primary',
  completed: 'bg-emerald-100 text-emerald-700',
  planned: 'bg-amber-100 text-amber-700',
  building: 'bg-blue-100 text-blue-700',
};
const statusLabels: Record<string, string> = {
  selling: 'Продажи', completed: 'Сдан', planned: 'Проект', building: 'Строится',
};

export default function ComplexList() {
  const [items, setItems]     = useState<CrmComplex[]>([]);
  const [meta, setMeta]       = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [search,     setSearch]     = useState('');
  const [builderId,  setBuilderId]  = useState('');
  const [districtId, setDistrictId] = useState('');
  const [status,     setStatus]     = useState('');
  const [page,       setPage]       = useState(1);

  const [builders,  setBuilders]  = useState<CrmBuilder[]>([]);
  const [districts, setDistricts] = useState<CrmDistrict[]>([]);

  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load filter options once
  useEffect(() => {
    listBuilders().then(r  => setBuilders(r.data)).catch(() => null);
    listDistricts().then(r => setDistricts(r.data)).catch(() => null);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listComplexes({
      search: search || undefined,
      builder_id:  builderId  ? Number(builderId)  : undefined,
      district_id: districtId ? Number(districtId) : undefined,
      status: status || undefined,
      page,
      per_page: 20,
    })
      .then(r => { setItems(r.data); setMeta(r.meta); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, builderId, districtId, status, page]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteComplex(deleteId);
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
          <h1 className="text-xl font-bold">Жилые комплексы</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `Всего: ${meta.total}` : ''}
          </p>
        </div>
        <Link
          to="/crm/complexes/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить ЖК
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-background border rounded-2xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по названию…"
            className="w-full pl-9 pr-3 h-9 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={builderId}
          onChange={e => { setBuilderId(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Все застройщики</option>
          {builders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select
          value={districtId}
          onChange={e => { setDistrictId(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Все районы</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Все статусы</option>
          {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={load} className="h-9 px-3 rounded-xl border hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Error */}
      {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-background border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Building2 className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Ничего не найдено</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Название</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Застройщик</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Район</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Квартиры</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    {c.address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />{c.address}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.builder ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{c.district ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.status ? (
                      <span className={cn('px-2 py-0.5 rounded-lg text-xs font-medium', statusColors[c.status] ?? 'bg-muted text-muted-foreground')}>
                        {statusLabels[c.status] ?? c.status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {c.apartments_count ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        to={`/crm/complexes/${c.id}/edit`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(c.id)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-muted disabled:opacity-40 transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-muted disabled:opacity-40 transition-colors"
          >
            →
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить ЖК?"
        message="Это действие необратимо. Комплекс и все связанные данные будут удалены."
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
