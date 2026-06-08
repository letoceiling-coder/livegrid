import { cn } from '@/lib/utils';
import { cardVisual } from '@/redesign/lib/card-visual';

type Props = {
  label: string;
  price: string;
  className?: string;
};

/** [label][flex dotted leader][price] — real dotted border, tabular price alignment */
export default function CardDottedPriceRow({ label, price, className }: Props) {
  return (
    <div className={cn('flex min-w-0 w-full items-baseline gap-2', className)} role="listitem">
      <span className={cn(cardVisual.dottedLabel, 'shrink-0 whitespace-nowrap')}>{label}</span>
      <span
        className="mb-[3px] h-0 min-w-[10px] flex-1 self-end border-b border-dotted border-muted-foreground/35"
        aria-hidden
      />
      <span className={cn(cardVisual.dottedPrice, 'shrink-0 whitespace-nowrap')}>{price}</span>
    </div>
  );
}
