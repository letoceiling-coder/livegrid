import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2, TrendingDown } from 'lucide-react';
import { formatPrice } from '@/redesign/data/mock-data';
import { useFavorites } from '@/shared/hooks/useFavorites';
import { apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import RelatedListingsCarousel from '@/discovery/components/RelatedListingsCarousel';
import ComplexCard from '@/redesign/components/ComplexCard';
import { mapApiBlockDetailToResidentialComplex, type ApiBlockDetail } from '@/redesign/lib/blocks-from-api';
import { useQuery } from '@tanstack/react-query';
import { apiGetOrNull } from '@/lib/api';

type FavoriteRow = {
  id: number;
  blockId: number | null;
  listingId: number | null;
  note: string | null;
  priceChangePct: number | null;
  hasPriceDrop: boolean;
  lastViewedAt: string | null;
  block?: { id: number; name: string; slug: string | null } | null;
  listing?: ApiListingCardRow & { title?: string | null; price?: unknown } | null;
};

function SwipeFavoriteCard({
  row,
  onRemove,
  children,
}: {
  row: FavoriteRow;
  onRemove: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 w-20 bg-destructive flex items-center justify-center text-destructive-foreground text-xs font-medium"
        aria-hidden
      >
        Удалить
      </div>
      <div
        className="relative bg-background transition-transform touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => setStartX(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (startX == null) return;
          const dx = e.touches[0].clientX - startX;
          if (dx < 0) setOffset(Math.max(dx, -80));
        }}
        onTouchEnd={() => {
          if (offset < -50) onRemove();
          setOffset(0);
          setStartX(null);
        }}
      >
        {row.hasPriceDrop ? (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <TrendingDown className="w-3 h-3" />
            {row.priceChangePct}%
          </span>
        ) : null}
        {children}
        <FavoriteNoteEditor favoriteId={row.id} note={row.note} />
      </div>
    </div>
  );
}

function FavoriteNoteEditor({ favoriteId, note }: { favoriteId: number; note: string | null }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note ?? '');

  const save = useMutation({
    mutationFn: () => apiPatch(`/favorites/${favoriteId}`, { note: text }),
    onSuccess: () => {
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  if (editing) {
    return (
      <div className="p-2 border-t">
        <input
          className="w-full text-xs border rounded-lg px-2 py-1.5 min-h-[36px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Заметка…"
        />
        <button type="button" className="text-xs text-primary mt-1 min-h-[36px]" onClick={() => save.mutate()}>
          Сохранить
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="w-full text-left text-[10px] text-muted-foreground px-3 py-2 border-t min-h-[36px]"
      onClick={() => setEditing(true)}
    >
      {note ? note : '+ Добавить заметку'}
    </button>
  );
}

function FavoriteBlockCard({ blockId, slug, name }: { blockId: number; slug?: string | null; name: string }) {
  const slugOrId = slug?.trim() ? slug.trim() : String(blockId);
  const q = useQuery({
    queryKey: ['favorite-block', slugOrId],
    queryFn: () => apiGetOrNull<ApiBlockDetail>(`/blocks/${encodeURIComponent(slugOrId)}`),
  });
  if (q.isLoading) return <div className="rounded-2xl border h-[420px] animate-pulse bg-muted" />;
  const apiBlock = q.data;
  if (!apiBlock) {
    return (
      <Link to={`/complex/${slugOrId}`} className="block rounded-2xl border p-4">
        <div className="font-semibold text-sm">{name}</div>
      </Link>
    );
  }
  return <ComplexCard complex={mapApiBlockDetailToResidentialComplex(apiBlock, [])} />;
}

export default function AccountFavoritesPage() {
  const { favorites, isLoading, removeByFavoriteId } = useFavorites();
  const rows = (favorites ?? []) as FavoriteRow[];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">У вас пока нет избранного</p>
        <Link to="/catalog" className="text-sm text-primary underline">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {rows.map((row) => (
        <SwipeFavoriteCard key={row.id} row={row} onRemove={() => void removeByFavoriteId(row.id)}>
          {row.blockId != null ? (
            <FavoriteBlockCard
              blockId={row.blockId}
              slug={row.block?.slug}
              name={row.block?.name ?? `ЖК #${row.blockId}`}
            />
          ) : row.listing ? (
            <ListingCard listing={row.listing as ApiListingCardRow} />
          ) : (
            <div className="p-4 border rounded-2xl text-sm">Объект недоступен</div>
          )}
          {row.listing?.price != null ? (
            <p className="text-xs font-semibold px-3 pb-2">{formatPrice(Number(row.listing.price))}</p>
          ) : null}
        </SwipeFavoriteCard>
      ))}
    </div>
    <RelatedListingsCarousel
      title="Рекомендуем по избранному"
      fetchUrl="/account/recommendations?per_page=8"
      queryKey={['account', 'recommendations', 'favorites-page']}
    />
    </div>
  );
}
