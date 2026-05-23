import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, GitCompare } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPriceFrom, isPriceFallbackText, priceAriaLabel } from '@/redesign/lib/display-price';
import { useAuth } from '@/shared/hooks/useAuth';
import { parseApiBlockId, useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import { cardBadgeClass, cardVisual, metaDotLine } from '@/redesign/lib/card-visual';

interface Props {
  complex: ResidentialComplex;
  variant?: 'grid' | 'list';
  coverAspect?: '16/9' | '4/3';
}

const statusStyles: Record<string, { variant: 'primary' | 'secondary' | 'outline'; accent: 'blue' | 'green' | 'orange'; label: string }> = {
  building: { variant: 'secondary', accent: 'blue', label: 'Строится' },
  completed: { variant: 'secondary', accent: 'green', label: 'Сдан' },
  planned: { variant: 'outline', accent: 'orange', label: 'Планируется' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = statusStyles[status];
  if (!s) return null;
  return (
    <span className={cardBadgeClass(s.variant, s.accent)}>
      {s.label}
    </span>
  );
};

function roomLabel(rooms: number): string {
  if (rooms === 0) return 'Студии';
  if (rooms >= 4) return '4+ комн.';
  return `${rooms}-комн.`;
}

const ComplexCard = ({ complex, variant = 'grid', coverAspect = '16/9' }: Props) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isBlockFavorite, toggleBlock } = useFavorites();
  const { isCompared, toggle: toggleCompare } = useCompare();
  const blockNum = parseApiBlockId(complex.id);
  const liked = blockNum != null && isBlockFavorite(blockNum);
  const inCompare = isCompared(complex.slug);
  const coverImages = complex.images.filter((src) => Boolean(src?.trim()));
  const hasCoverImage = coverImages.length > 0;
  const coverImage = coverImages[currentImageIndex] ?? coverImages[0] ?? '';
  const hasBuilder = Boolean(complex.builder && complex.builder !== '—');
  const hasDeadline = Boolean(complex.deadline && complex.deadline !== '—');
  const fromBuildings = complex.buildings.reduce(
    (s, b) => s + b.apartments.filter((a) => a.status === 'available').length,
    0,
  );
  const totalApts = Math.max(complex.listingCount ?? 0, fromBuildings);
  const priceBands = [...complex.buildings.flatMap((b) => b.apartments)]
    .filter((a) => a.status !== 'sold' && a.price > 0)
    .reduce<Map<number, number>>((acc, apt) => {
      const key = apt.rooms >= 4 ? 4 : apt.rooms;
      const prev = acc.get(key);
      if (prev == null || apt.price < prev) acc.set(key, apt.price);
      return acc;
    }, new Map<number, number>());
  const priceFormatted = formatPriceFrom(complex.priceFrom);
  const priceIsFallback = isPriceFallbackText(priceFormatted);
  const locationLine = metaDotLine([
    complex.district !== '—' ? complex.district : null,
    complex.subway !== '—' ? `м. ${complex.subway}` : null,
    complex.subwayDistance !== '—' ? complex.subwayDistance : null,
  ]);
  const detailLine = metaDotLine([
    totalApts > 0 ? `${totalApts} кв.` : null,
    hasDeadline ? `сдача ${complex.deadline}` : null,
    hasBuilder ? complex.builder : null,
  ]);

  const priceBandRows = Array.from(priceBands.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, 3);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blockNum == null) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    void toggleBlock(blockNum);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(complex.slug);
  };

  if (variant === 'list') {
    return (
      <Link
        to={`/complex/${complex.slug}`}
        className={cn(cardVisual.cardShell, 'group flex hover:shadow-md')}
      >
        {hasCoverImage ? (
          <div className="relative w-[220px] shrink-0 overflow-hidden bg-muted min-h-[160px]">
            <StableMediaFrame
              src={coverImages[0]}
              altContext={complex.name}
              decorative={false}
              aspect="4/3"
              className="h-full min-h-[160px]"
              imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <div className="absolute top-1.5 left-1.5 z-10">
              <StatusBadge status={complex.status} />
            </div>
            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 z-10">
              <button
                type="button"
                title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
                className="w-7 h-7 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                onClick={handleCompare}
              >
                <GitCompare className={cn('w-3.5 h-3.5', inCompare ? 'text-primary' : 'text-muted-foreground')} />
              </button>
              <button
                type="button"
                title="Избранное"
                className="w-7 h-7 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                onClick={handleLike}
              >
                <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
              </button>
            </div>
          </div>
        ) : null}
        <div className={cn(cardVisual.cardBody, 'flex-1 justify-between gap-1.5')}>
          <div className="min-w-0 space-y-1">
            <p
              className={cn(priceIsFallback ? cardVisual.priceFallback : cardVisual.price)}
              aria-label={priceAriaLabel(priceFormatted)}
            >
              {priceFormatted}
            </p>
            <h3 className={cn(cardVisual.title, 'truncate group-hover:text-primary transition-colors')}>{complex.name}</h3>
            {locationLine ? <p className={cardVisual.metaMuted}>{locationLine}</p> : null}
            {detailLine ? <p className={cardVisual.metaMuted}>{detailLine}</p> : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/complex/${complex.slug}`}
      className={cn(cardVisual.cardShell, 'group flex flex-col hover:shadow-md')}
    >
      {hasCoverImage ? (
        <div className={cn('relative shrink-0 overflow-hidden', coverAspect === '4/3' ? 'aspect-[4/3]' : 'aspect-video')}>
          <StableMediaFrame
            src={coverImage}
            altContext={complex.name}
            decorative={false}
            aspect="none"
            className="absolute inset-0"
            imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <div className="absolute top-2 left-2">
            <StatusBadge status={complex.status} />
          </div>
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            <button
              type="button"
              title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-background/70 backdrop-blur-sm hover:bg-background/90"
              onClick={handleCompare}
            >
              <GitCompare className={cn('w-3.5 h-3.5', inCompare ? 'text-primary' : 'text-muted-foreground')} />
            </button>
            <button
              type="button"
              title="Избранное"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-background/70 backdrop-blur-sm hover:bg-background/90"
              onClick={handleLike}
            >
              <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
            </button>
          </div>
          {coverImages.length > 1 && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {coverImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    index === currentImageIndex ? 'bg-background' : 'bg-background/40'
                  )}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(index); }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className={cardVisual.cardBodyGrid}>
        <p
          className={cn(priceIsFallback ? cardVisual.priceGridFallback : cardVisual.priceGrid)}
          aria-label={priceAriaLabel(priceFormatted)}
        >
          {priceFormatted}
        </p>
        <h3 className={cardVisual.titleGrid}>{complex.name}</h3>
        {locationLine ? <p className={cardVisual.metaDot}>{locationLine}</p> : null}
        {detailLine ? <p className={cardVisual.metaMuted}>{detailLine}</p> : null}
        {priceBandRows.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 border-t border-border/50">
            {priceBandRows.map(([rooms, price]) => (
              <span key={rooms} className={cardVisual.metaMuted}>
                {roomLabel(rooms)} <span className="font-medium text-foreground/80">{formatPriceFrom(price)}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
};

export default ComplexCard;
