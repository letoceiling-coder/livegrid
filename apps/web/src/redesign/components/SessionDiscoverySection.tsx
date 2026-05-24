import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useBrowseHistory } from '@/shared/hooks/useBrowseHistory';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import { cn } from '@/lib/utils';

type SessionPayload = {
  data: ApiListingCardRow[];
  roomLinks: Array<{ rooms: number; label: string; direction: 'down' | 'up' }>;
  meta: { count: number; anchorId?: number };
};

type Props = {
  regionId?: number | null;
  excludeListingId?: number;
  className?: string;
};

export default function SessionDiscoverySection({ regionId, excludeListingId, className }: Props) {
  const { recentListingIds } = useBrowseHistory(6);
  const ids = recentListingIds.filter((id) => id !== excludeListingId);

  const query = useQuery({
    queryKey: ['discovery', 'session', ids.join(','), regionId],
    queryFn: () => {
      const sp = new URLSearchParams({ listing_ids: ids.join(',') });
      if (regionId != null) sp.set('region_id', String(regionId));
      sp.set('limit', '8');
      return apiGet<SessionPayload>(`/discovery/session?${sp.toString()}`);
    },
    enabled: ids.length >= 1,
    staleTime: 60_000,
  });

  const rows = (query.data?.data ?? []).filter((r) => r.id !== excludeListingId);
  const roomLinks = query.data?.roomLinks ?? [];

  if (!ids.length || query.isLoading || rows.length === 0) return null;

  return (
    <section className={cn('space-y-3', className)} aria-label="По вашей сессии">
      <h2 className="text-lg font-bold flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-primary" />
        Смотрели вместе с этим
      </h2>
      {roomLinks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-1">
          {roomLinks.map((r) => (
            <Link
              key={r.rooms}
              to={`/catalog?${regionId != null ? `region_id=${regionId}&` : ''}rooms=${r.rooms}`}
              className="text-xs px-2.5 py-1 rounded-full border bg-muted/30 hover:border-primary/40"
            >
              {r.direction === 'down' ? '↓' : '↑'} {r.label}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {rows.map((listing) => (
          <div key={listing.id} className="snap-start shrink-0 w-[260px] sm:w-[280px]">
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>
    </section>
  );
}
