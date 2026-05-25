import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, GitCompare, MapPin, TrainFront, Building2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPriceFrom, isPriceFallbackText, priceAriaLabel } from '@/redesign/lib/display-price';
import { useAuth } from '@/shared/hooks/useAuth';
import { parseApiBlockId, useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import CardDottedPriceRow from '@/redesign/components/CardDottedPriceRow';
import {
  cardVisual,
  complexCompletionLine,
  complexImageOverlayLines,
  complexMetroTimeLabel,
  complexRoomBandLabel,
} from '@/redesign/lib/card-visual';

interface Props {
  complex: ResidentialComplex;
  variant?: 'grid' | 'list';
  coverAspect?: '16/9' | '4/3';
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
  const hasAddress = Boolean(complex.address && complex.address !== '—');
  const primaryMetro = complex.nearbySubways?.[0];
  const metroName =
    primaryMetro?.name?.trim() ||
    (complex.subway !== '—' ? complex.subway.replace(/^м\.\s*/i, '').trim() : '');
  const metroTime =
    complex.subwayDistance && complex.subwayDistance !== '—'
      ? complex.subwayDistance
      : primaryMetro
        ? complexMetroTimeLabel(primaryMetro.distanceTime, primaryMetro.distanceType ?? undefined)
        : '';
  const completion = complexCompletionLine(complex);
  const overlay = complexImageOverlayLines(complex);
  const showOverlay = Boolean(overlay.primary || overlay.secondary);

  const priceBands = [...complex.buildings.flatMap((b) => b.apartments)]
    .filter((a) => a.status !== 'sold' && a.price > 0)
    .reduce<Map<number, number>>((acc, apt) => {
      const key = apt.rooms >= 4 ? 4 : apt.rooms;
      const prev = acc.get(key);
      if (prev == null || apt.price < prev) acc.set(key, apt.price);
      return acc;
    }, new Map<number, number>());

  const priceBandRows = Array.from(priceBands.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, 3)
    .map(([rooms, price]) => ({
      rooms,
      label: complexRoomBandLabel(rooms),
      price: formatPriceFrom(price),
    }));

  const fallbackPrice = formatPriceFrom(complex.priceFrom);
  const priceIsFallback = isPriceFallbackText(fallbackPrice);

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

  const actionButtons = (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <button
        type="button"
        title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90"
        onClick={handleCompare}
      >
        <GitCompare className={cn('h-3.5 w-3.5', inCompare ? 'text-primary' : 'text-muted-foreground')} />
      </button>
      <button
        type="button"
        title="Избранное"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90"
        onClick={handleLike}
      >
        <Heart className={cn('h-3.5 w-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
      </button>
    </div>
  );

  const contentBlock = (
    <>
      <h3 className={cn(cardVisual.complexTitle, 'group-hover:text-primary transition-colors')}>
        {complex.name}
      </h3>

      {metroName ? (
        <div className={cardVisual.complexMetaRow}>
          <TrainFront className={cardVisual.complexMetaIcon} aria-hidden />
          <span className="truncate">
            <span className="text-foreground/85">
              {metroName.startsWith('м.') ? metroName : `м. ${metroName}`}
            </span>
            {metroTime ? <span className="text-muted-foreground"> · {metroTime}</span> : null}
          </span>
        </div>
      ) : null}

      {hasAddress ? (
        <div className={cardVisual.complexMetaRow}>
          <MapPin className={cardVisual.complexMetaIcon} aria-hidden />
          <span className="truncate">{complex.address}</span>
        </div>
      ) : null}

      {hasBuilder ? (
        <div className={cardVisual.complexMetaRow}>
          <Building2 className={cardVisual.complexMetaIcon} aria-hidden />
          <span className="truncate">{complex.builder}</span>
        </div>
      ) : null}

      {completion ? <p className={cardVisual.complexCompletion}>{completion}</p> : null}

      {priceBandRows.length > 0 ? (
        <div className={cardVisual.dottedBlock} role="list">
          {priceBandRows.map((row) => (
            <CardDottedPriceRow key={row.rooms} label={row.label} price={row.price} />
          ))}
        </div>
      ) : !priceIsFallback ? (
        <div className={cardVisual.dottedBlock} role="list">
          <CardDottedPriceRow label="Цены от" price={fallbackPrice} />
        </div>
      ) : null}

      <div className={cardVisual.complexFooter}>
        <span className={cardVisual.complexFooterPill}>Новостройки</span>
      </div>
    </>
  );

  if (variant === 'list') {
    return (
      <Link
        to={`/complex/${complex.slug}`}
        className={cn(cardVisual.complexShell, 'group flex hover:shadow-md')}
      >
        {hasCoverImage ? (
          <div className="relative w-[200px] shrink-0 overflow-hidden bg-muted min-h-[148px] sm:w-[220px]">
            <StableMediaFrame
              src={coverImages[0]}
              altContext={complex.name}
              decorative={false}
              aspect="4/3"
              className="h-full min-h-[148px] rounded-none"
              imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
            />
            {showOverlay ? (
              <div className={cardVisual.complexOverlayStack}>
                {overlay.primary ? <span className={cardVisual.complexOverlayPill}>{overlay.primary}</span> : null}
                {overlay.secondary ? (
                  <span className={cardVisual.complexOverlayPill}>{overlay.secondary}</span>
                ) : null}
              </div>
            ) : null}
            {actionButtons}
          </div>
        ) : null}
        <div className={cn(cardVisual.complexBody, 'flex-1 justify-between')}>{contentBlock}</div>
      </Link>
    );
  }

  return (
    <Link
      to={`/complex/${complex.slug}`}
      className={cn(cardVisual.complexShell, 'group flex flex-col')}
    >
      {hasCoverImage ? (
        <div
          className={cn(
            cardVisual.complexMedia,
            coverAspect === '4/3' ? 'aspect-[4/3]' : 'aspect-[16/10]',
          )}
        >
          <StableMediaFrame
            src={coverImage}
            altContext={complex.name}
            decorative={false}
            aspect="none"
            className="absolute inset-0"
            imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
          />
          {showOverlay ? (
            <div className={cardVisual.complexOverlayStack}>
              {overlay.primary ? <span className={cardVisual.complexOverlayPill}>{overlay.primary}</span> : null}
              {overlay.secondary ? (
                <span className={cardVisual.complexOverlayPill}>{overlay.secondary}</span>
              ) : null}
            </div>
          ) : null}
          {actionButtons}
          {coverImages.length > 1 ? (
            <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {coverImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    index === currentImageIndex ? 'bg-background' : 'bg-background/40',
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cardVisual.complexBody}>{contentBlock}</div>
    </Link>
  );
};

export default ComplexCard;
