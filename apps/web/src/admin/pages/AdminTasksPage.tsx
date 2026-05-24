import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCircle2,
  Loader2,
  Phone,
  X,
} from 'lucide-react';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { crmApiGet } from '@/admin/lib/crm-api';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { crmQueryOptions, crmErrorMessage } from '@/admin/lib/crm-query-options';
import { crmInvalidate } from '@/admin/lib/crm-invalidation';
import CrmInlineError from '@/admin/components/CrmInlineError';
import { CRM_FOLLOWUP_TASK_LABEL, CRM_AUTOMATION_RULE_LABEL } from '@lg/shared';
import { telHrefFromPhone } from '@/admin/lib/request-crm';

type TaskFilter = 'today' | 'overdue' | 'followup' | 'callbacks' | 'escalations' | 'completed';

type TaskRow = {
  id: number;
  requestId: number;
  taskType: string;
  ruleType: string | null;
  status: string;
  title: string;
  body: string | null;
  priorityScore: number;
  dueAt: string | null;
  createdAt: string;
  request: {
    id: number;
    name: string | null;
    phone: string | null;
    status: string;
    type: string;
  };
};

type Summary = {
  today: number;
  overdue: number;
  followup: number;
  callbacks: number;
  escalations: number;
  completedToday: number;
};

const FILTERS: Array<{ id: TaskFilter; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: 'overdue', label: 'Просрочено' },
  { id: 'followup', label: 'Follow-up' },
  { id: 'callbacks', label: 'Callbacks' },
  { id: 'escalations', label: 'Эскалации' },
  { id: 'completed', label: 'Выполнено' },
];

function formatDue(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'просрочено';
  if (diff < 3_600_000) return `${Math.ceil(diff / 60_000)} мин`;
  if (diff < 86_400_000) return `${Math.ceil(diff / 3_600_000)} ч`;
  return d.toLocaleDateString('ru-RU');
}

function SwipeTaskCard({
  row,
  onComplete,
  onDismiss,
  children,
}: {
  row: TaskRow;
  onComplete: () => void;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const isOpen = row.status === 'PENDING' || row.status === 'IN_PROGRESS';

  if (!isOpen) return <div className="relative">{children}</div>;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 w-24 bg-emerald-600 flex items-center justify-center text-white text-xs font-medium"
        aria-hidden
      >
        Готово
      </div>
      <div
        className="relative bg-card transition-transform touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => setStartX(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (startX == null) return;
          const dx = e.touches[0].clientX - startX;
          if (dx < 0) setOffset(Math.max(dx, -96));
        }}
        onTouchEnd={() => {
          if (offset < -60) onComplete();
          setOffset(0);
          setStartX(null);
        }}
      >
        {children}
        <div className="absolute top-2 right-2 flex gap-1 sm:hidden">
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-full bg-muted text-muted-foreground"
            aria-label="Отклонить"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  row,
  onComplete,
  onDismiss,
  busy,
}: {
  row: TaskRow;
  onComplete: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const label = row.request.name?.trim() || row.request.phone?.trim() || `#${row.requestId}`;
  const phoneHref = row.request.phone ? telHrefFromPhone(row.request.phone) : '';
  const isOverdue = row.dueAt && new Date(row.dueAt).getTime() < Date.now();
  const isOpen = row.status === 'PENDING' || row.status === 'IN_PROGRESS';

  const inner = (
    <div
      className={cn(
        'rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 min-h-[72px]',
        isOverdue && isOpen && 'border-red-500/40 bg-red-500/5',
        row.priorityScore >= 90 && isOpen && 'ring-1 ring-red-500/30',
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">#{row.requestId}</span>
          <span className="text-sm font-medium truncate">{label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {CRM_FOLLOWUP_TASK_LABEL[row.taskType as keyof typeof CRM_FOLLOWUP_TASK_LABEL] ?? row.taskType}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{row.body ?? row.title}</p>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span>приоритет {row.priorityScore}</span>
          <span>·</span>
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {formatDue(row.dueAt)}
          </span>
          {row.ruleType ? (
            <>
              <span>·</span>
              <span>{CRM_AUTOMATION_RULE_LABEL[row.ruleType as keyof typeof CRM_AUTOMATION_RULE_LABEL] ?? row.ruleType}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {phoneHref && row.taskType === 'CALL_CLIENT' ? (
          <a
            href={phoneHref}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium touch-manipulation"
          >
            <Phone className="w-3.5 h-3.5" />
            Позвонить
          </a>
        ) : null}
        <Link
          to={`/admin/requests/${row.requestId}`}
          className="h-10 px-3 rounded-lg border text-xs font-medium inline-flex items-center touch-manipulation"
        >
          Заявка
        </Link>
        {isOpen ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="hidden sm:inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Готово
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDismiss}
              className="hidden sm:inline-flex h-10 px-2 rounded-lg border text-muted-foreground disabled:opacity-50"
              aria-label="Отклонить"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        )}
      </div>
    </div>
  );

  return (
    <SwipeTaskCard row={row} onComplete={onComplete} onDismiss={onDismiss}>
      {inner}
    </SwipeTaskCard>
  );
}

export default function AdminTasksPage() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') as TaskFilter) || 'today';
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);

  const summaryQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.automation.summary,
    queryFn: () => crmApiGet<Summary>('/admin/tasks/summary', 'tasks_summary'),
    ...crmQueryOptions({ staleTime: 15_000 }),
  });

  const listQuery = useQuery({
    queryKey: CRM_QUERY_KEYS.automation.list(filter, page),
    queryFn: () =>
      crmApiGet<{ data: TaskRow[]; meta: { total_pages: number; total: number } }>(
        `/admin/tasks?filter=${filter}&page=${page}`,
        'tasks_list',
      ),
    ...crmQueryOptions({ staleTime: 15_000 }),
  });

  const completeMut = useMutation({
    mutationFn: (id: number) => apiPost(`/admin/tasks/${id}/complete`, {}),
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      void crmInvalidate(qc, 'tasks');
    },
  });

  const dismissMut = useMutation({
    mutationFn: (id: number) => apiPost(`/admin/tasks/${id}/dismiss`, {}),
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      void crmInvalidate(qc, 'tasks');
    },
  });

  const summary = summaryQuery.data;
  const rows = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.meta.total_pages ?? 1;

  const countFor = (f: TaskFilter): number => {
    if (!summary) return 0;
    const map: Record<TaskFilter, number> = {
      today: summary.today,
      overdue: summary.overdue,
      followup: summary.followup,
      callbacks: summary.callbacks,
      escalations: summary.escalations,
      completed: summary.completedToday,
    };
    return map[f];
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl pb-28">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Задачи</h1>
        <p className="text-sm text-muted-foreground mt-1">Follow-up, callbacks и эскалации</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setParams({ filter: f.id });
              setPage(1);
            }}
            className={cn(
              'shrink-0 rounded-full px-3 py-2 text-xs font-medium border min-h-[40px] touch-manipulation',
              filter === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card',
            )}
          >
            {f.label}
            {summary ? (
              <span className="ml-1 opacity-80">({countFor(f.id)})</span>
            ) : null}
          </button>
        ))}
      </div>

      {listQuery.isError ? (
        <CrmInlineError
          message={crmErrorMessage(listQuery.error, 'Не удалось загрузить задачи')}
          onRetry={() => void listQuery.refetch()}
          className="mb-4"
        />
      ) : null}

      {listQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">Нет задач в этой категории</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <TaskCard
                row={row}
                busy={busyId === row.id}
                onComplete={() => completeMut.mutate(row.id)}
                onDismiss={() => dismissMut.mutate(row.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-2 text-sm rounded-lg border disabled:opacity-40 min-h-[44px]"
          >
            Назад
          </button>
          <span className="text-sm text-muted-foreground self-center">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-2 text-sm rounded-lg border disabled:opacity-40 min-h-[44px]"
          >
            Далее
          </button>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 sm:hidden border-t bg-background/95 backdrop-blur px-4 py-3 flex gap-2 z-40">
        <Link
          to="/admin/requests?sla=overdue"
          className="flex-1 h-11 rounded-lg border text-xs font-medium inline-flex items-center justify-center"
        >
          Просроченные
        </Link>
        <Link
          to="/admin/conversations?filter=callbacks"
          className="flex-1 h-11 rounded-lg border text-xs font-medium inline-flex items-center justify-center"
        >
          Callbacks
        </Link>
      </div>
    </div>
  );
}
