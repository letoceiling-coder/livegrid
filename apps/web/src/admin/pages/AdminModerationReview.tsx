import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Shield } from 'lucide-react';
import type { RevisionDiffResult, WizardServerPayload } from '@lg/shared';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { LISTING_VISIBILITY_LABEL } from '@/admin/lib/listingVisibility';
import RevisionDiffPanel from '@/admin/components/moderation/RevisionDiffPanel';
import MediaDiffGrid from '@/admin/components/moderation/MediaDiffGrid';
import ModerationTimeline from '@/admin/components/moderation/ModerationTimeline';
import ModerationActionBar from '@/admin/components/moderation/ModerationActionBar';

type ReviewBundle = {
  listing: {
    id: number;
    kind: string;
    visibility: string;
    moderationNote: string | null;
    draftVersion: number;
    isLivePublic: boolean;
    isPendingRevision: boolean;
    region: { name: string } | null;
    ownerUser: { fullName: string | null; email: string | null } | null;
  };
  live: WizardServerPayload;
  pending: WizardServerPayload;
  diff: RevisionDiffResult;
  history: Array<{
    id: number;
    action: string;
    note: string | null;
    createdAt: string;
    user: { fullName: string | null; email: string | null } | null;
  }>;
  invariants: {
    publicListingProtected: boolean;
    rejectDoesNotDeleteLive: boolean;
    pendingRevisionIsolated: boolean;
  };
};

export default function AdminModerationReview() {
  const { listingId } = useParams<{ listingId: string }>();
  const id = Number(listingId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['moderation', 'review', id],
    queryFn: () => apiGet<ReviewBundle>(`/admin/moderation/listings/${id}/review`),
    enabled: Number.isFinite(id),
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, note }: { action: string; note?: string }) =>
      apiPatch(`/admin/moderation/listings/${id}`, {
        action,
        note,
        expectedVersion: data?.listing.draftVersion,
      }),
    onSuccess: async (_data, variables) => {
      toast.success('Действие выполнено');
      await qc.invalidateQueries({ queryKey: ['moderation'] });
      await refetch();
      if (variables.action === 'approve') {
        navigate('/admin/moderation/listings');
      }
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Ошибка';
      toast.error(msg);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 flex justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { listing, diff, invariants } = data;

  return (
    <div className="p-4 sm:p-6 max-w-5xl pb-32">
      <div className="flex items-center gap-3 mb-6">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link to="/admin/moderation/listings">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            Review #{listing.id}
          </h1>
          <p className="text-sm text-muted-foreground">
            {LISTING_VISIBILITY_LABEL[listing.visibility as keyof typeof LISTING_VISIBILITY_LABEL] ??
              listing.visibility}
            {listing.isPendingRevision ? ' · неопубликованные правки' : ''}
          </p>
        </div>
      </div>

      {invariants.publicListingProtected ? (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
          Публичная карточка защищена — на сайте показывается опубликованная версия до одобрения.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="rounded-2xl border p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Опубликовано (live)
          </h2>
          <p className="text-sm">Цена: {data.live.price || '—'} ₽</p>
          <p className="text-sm">Адрес: {data.live.address || '—'}</p>
          <p className="text-xs text-muted-foreground">
            Агент: {listing.ownerUser?.fullName ?? listing.ownerUser?.email ?? '—'}
          </p>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <h2 className="font-semibold text-sm text-amber-800 uppercase tracking-wide">
            На модерации (pending)
          </h2>
          <p className="text-sm">Цена: {data.pending.price || '—'} ₽</p>
          <p className="text-sm">Адрес: {data.pending.address || '—'}</p>
          {listing.moderationNote ? (
            <p className="text-xs text-red-700">{listing.moderationNote}</p>
          ) : null}
        </section>
      </div>

      <section className="rounded-2xl border p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="font-semibold">Сравнение полей</h2>
        <RevisionDiffPanel diff={diff} />
      </section>

      <section className="rounded-2xl border p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="font-semibold">Медиа</h2>
        <MediaDiffGrid media={diff.media} />
      </section>

      <section className="rounded-2xl border p-4 sm:p-6 mb-6 space-y-4">
        <h2 className="font-semibold">История</h2>
        <ModerationTimeline history={data.history} />
      </section>

      <ModerationActionBar
        draftVersion={listing.draftVersion}
        pending={actionMutation.isPending}
        onAction={(action, note) => actionMutation.mutate({ action, note })}
      />
    </div>
  );
}
