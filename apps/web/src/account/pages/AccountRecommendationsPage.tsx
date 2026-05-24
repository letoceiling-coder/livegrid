import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { apiGet } from '@/lib/api';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import { RECOMMENDATION_REASON_LABEL } from '@lg/shared';

type RecommendationRow = ApiListingCardRow & {
  recommendation?: { reason?: string; score?: number };
};

export default function AccountRecommendationsPage() {
  const feedQuery = useQuery({
    queryKey: ['account', 'recommendations'],
    queryFn: () =>
      apiGet<{ data: RecommendationRow[]; meta?: { coldStart?: boolean } }>('/account/recommendations'),
    staleTime: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ['account', 'history', 'continue'],
    queryFn: () => apiGet<Array<{ entityKind: string; entityId: number; title: string | null }>>('/account/history'),
    staleTime: 30_000,
  });

  const rows = feedQuery.data?.data ?? [];
  const continueItems = (historyQuery.data ?? []).filter((h) => h.entityKind === 'LISTING').slice(0, 6);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-semibold text-base flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          Рекомендации для вас
        </h2>
        {feedQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Подбираем объекты…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Добавьте объекты в избранное или сохраните поиск — появятся персональные рекомендации.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((listing) => (
              <div key={listing.id} className="space-y-1">
                {listing.recommendation?.reason ? (
                  <p className="text-[11px] text-muted-foreground px-1">
                    {RECOMMENDATION_REASON_LABEL[listing.recommendation.reason] ??
                      listing.recommendation.reason}
                  </p>
                ) : null}
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </section>

      {continueItems.length > 0 ? (
        <section>
          <h2 className="font-semibold text-base mb-3">Продолжить просмотр</h2>
          <ul className="space-y-2">
            {continueItems.map((h) => (
              <li key={`${h.entityKind}-${h.entityId}`}>
                <Link
                  to={`/listing/${h.entityId}`}
                  className="block rounded-xl border px-4 py-3 text-sm hover:bg-muted/50 min-h-[44px] touch-manipulation"
                >
                  {h.title ?? `Объект #${h.entityId}`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
