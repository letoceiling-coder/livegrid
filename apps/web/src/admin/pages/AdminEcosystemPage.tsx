import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, UserCircle } from 'lucide-react';
import { crmApiGet, crmApiPost } from '@/admin/lib/crm-api';
import { crmQueryOptions } from '@/admin/lib/crm-query-options';
import CrmInlineError from '@/admin/components/CrmInlineError';

type AgencyRow = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  user: { fullName: string | null; email: string | null };
};

type AgentRow = {
  id: string;
  slug: string;
  status: string;
  user: { fullName: string | null; email: string | null };
};

export default function AdminEcosystemPage() {
  const qc = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['admin', 'ecosystem', 'profiles'],
    queryFn: () =>
      crmApiGet<{ agencies: AgencyRow[]; agents: AgentRow[]; pendingBrandingReview: number }>(
        '/admin/ecosystem/profiles',
        'ecosystem_profiles',
      ),
    ...crmQueryOptions({ staleTime: 30_000 }),
  });

  const publishAgency = useMutation({
    mutationFn: (id: string) =>
      crmApiPost(`/admin/ecosystem/agencies/${id}/status`, { status: 'PUBLISHED' }, 'eco_publish_agency'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'ecosystem'] }),
  });

  const suspendAgency = useMutation({
    mutationFn: (id: string) =>
      crmApiPost(`/admin/ecosystem/agencies/${id}/status`, { status: 'SUSPENDED' }, 'eco_suspend_agency'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'ecosystem'] }),
  });

  const publishAgent = useMutation({
    mutationFn: (id: string) =>
      crmApiPost(`/admin/ecosystem/agents/${id}/status`, { status: 'PUBLISHED' }, 'eco_publish_agent'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'ecosystem'] }),
  });

  const data = profilesQuery.data;

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Ecosystem
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Публичные профили · модерация · branding
          {data ? ` · branding review: ${data.pendingBrandingReview}` : ''}
        </p>
      </div>

      {profilesQuery.isError ? <CrmInlineError message="Не удалось загрузить профили" /> : null}

      {profilesQuery.isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      ) : data ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Агентства
            </h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {data.agencies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет профилей</p>
              ) : (
                data.agencies.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 text-sm flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.displayName}</p>
                      <p className="text-xs text-muted-foreground">/{a.slug} · {a.status}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {a.status !== 'PUBLISHED' ? (
                        <button
                          type="button"
                          disabled={publishAgency.isPending}
                          onClick={() => publishAgency.mutate(a.id)}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground min-h-[32px]"
                        >
                          Publish
                        </button>
                      ) : null}
                      {a.status !== 'SUSPENDED' ? (
                        <button
                          type="button"
                          disabled={suspendAgency.isPending}
                          onClick={() => suspendAgency.mutate(a.id)}
                          className="text-xs px-2 py-1 rounded border min-h-[32px]"
                        >
                          Suspend
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <UserCircle className="w-4 h-4" /> Агенты
            </h2>
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {data.agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет профилей</p>
              ) : (
                data.agents.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 text-sm flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.user.fullName ?? a.user.email}</p>
                      <p className="text-xs text-muted-foreground">/{a.slug} · {a.status}</p>
                    </div>
                    {a.status !== 'PUBLISHED' ? (
                      <button
                        type="button"
                        disabled={publishAgent.isPending}
                        onClick={() => publishAgent.mutate(a.id)}
                        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground min-h-[32px] shrink-0"
                      >
                        Publish
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
