import { cn } from '@/lib/utils';
import { cardVisual } from '@/redesign/lib/card-visual';

type Props = {
  label: string;
  price: string;
  className?: string;
};

/** [label][flex dotted leader][price] — responsive, no fake dot characters */
export default function CardDottedPriceRow({ label, price, className }: Props) {
  return (
    <div className={cn('flex min-w-0 w-full items-baseline gap-1.5', className)} role="listitem">
      <span className={cn(cardVisual.dottedLabel, 'shrink-0 max-w-[45%] truncate')}>{label}</span>
      <span
        className="mb-[3px] min-w-[8px] flex-1 border-b border-dotted border-muted-foreground/35"
        aria-hidden
      />
      <span className={cn(cardVisual.dottedPrice, 'shrink-0 max-w-[52%] truncate text-right')}>
        {price}
      </span>
    </div>
  );
}
