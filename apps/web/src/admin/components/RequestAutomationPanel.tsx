import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bot, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CRM_QUERY_KEYS } from '@/admin/lib/crm-query-keys';
import { crmQueryOptions } from '@/admin/lib/crm-query-options';
import { crmObsAutomationFetch } from '@/admin/lib/crm-observability';
import {
  CRM_AUTOMATION_RULE_LABEL,
  CRM_FOLLOWUP_TASK_LABEL,
  type AutomationMatch,
} from '@lg/shared';

type AutomationContext = {
  recommendations: AutomationMatch[];
  tasks: Array<{
    id: number;
    taskType: string;
    ruleType: string | null;
    status: string;
    title: string;
    priorityScore: number;
    dueAt: string | null;
  }>;
  actions: Array<{
    id: number;
    actionKind: string;
    createdAt: string;
    rule: { ruleType: string };
  }>;
  pendingTasks: number;
};

export default function RequestAutomationPanel({ requestId }: { requestId: number }) {
  const query = useQuery({
    queryKey: CRM_QUERY_KEYS.automation.request(requestId),
    queryFn: async () => {
      const t0 = performance.now();
      const res = await apiGet<AutomationContext>(`/admin/requests/${requestId}/automation`);
      crmObsAutomationFetch(performance.now() - t0, res.pendingTasks, res.recommendations.length);
      return res;
    },
    ...crmQueryOptions({ staleTime: 20_000 }),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Загрузка автоматизации…
      </div>
    );
  }

  const data = query.data;
  if (!data) return null;

  const openTasks = data.tasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const hasEscalation = data.recommendations.some(
    (r) => r.priorityScore >= 85 || r.taskType === 'ESCALATE_NEGOTIATION' || r.taskType === 'RESCUE_REOPEN',
  );

  return (
    <section className="rounded-xl border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5" />
          Автоматизация
        </h2>
        <Link to="/admin/tasks" className="text-xs text-primary hover:underline">
          Все задачи
        </Link>
      </div>

      {hasEscalation ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Рекомендуется эскалация или срочный follow-up</span>
        </div>
      ) : null}

      {data.recommendations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">Рекомендации</p>
          <ul className="space-y-1.5">
            {data.recommendations.slice(0, 4).map((r) => (
              <li
                key={r.ruleType}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs',
                  r.priorityScore >= 90 && 'border-red-500/30 bg-red-500/5',
                  r.priorityScore >= 70 && r.priorityScore < 90 && 'border-amber-500/30 bg-amber-500/5',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {CRM_FOLLOWUP_TASK_LABEL[r.taskType as keyof typeof CRM_FOLLOWUP_TASK_LABEL]}
                  </span>
                  <span className="text-muted-foreground">P{r.priorityScore}</span>
                </div>
                <p className="text-muted-foreground mt-0.5">
                  {CRM_AUTOMATION_RULE_LABEL[r.ruleType as keyof typeof CRM_AUTOMATION_RULE_LABEL]} — {r.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Нет активных рекомендаций</p>
      )}

      {openTasks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase text-muted-foreground font-medium">
            Открытые задачи ({openTasks.length})
          </p>
          <ul className="space-y-1">
            {openTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-muted-foreground shrink-0">P{t.priorityScore}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.actions.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            История автоматизации ({data.actions.length})
          </summary>
          <ul className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
            {data.actions.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>
                  {CRM_AUTOMATION_RULE_LABEL[a.rule.ruleType as keyof typeof CRM_AUTOMATION_RULE_LABEL] ?? a.rule.ruleType}
                </span>
                <span>·</span>
                <time>{new Date(a.createdAt).toLocaleString('ru-RU')}</time>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
