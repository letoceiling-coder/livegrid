import { Link } from 'react-router-dom';
import { Building2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import {
  formatPriceFrom,
  formatDisplayPrice,
  isPriceHidden,
  isPriceFallbackText,
  PRICE_ON_REQUEST_CLASS,
  priceAriaLabel,
} from '@/redesign/lib/display-price';
import { CONVERSION_CTA } from '@/redesign/lib/conversion-cta';

type Props = {
  complex: ResidentialComplex;
  availableCount: number;
  onConsultation: () => void;
  className?: string;
};

function statusLabel(status: ResidentialComplex['status']): string | null {
  if (status === 'completed') return 'Сдан';
  if (status === 'building') return 'Строится';
  if (status === 'planned') return 'Планируется';
  return null;
}

export default function ComplexStickySidebar({ complex, availableCount, onConsultation, className }: Props) {
  const priceText = formatPriceFrom(complex.priceFrom);
  const st = statusLabel(complex.status);

  return (
    <aside
      className={cn(
        'rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3',
        className,
      )}
    >
      <div>
        <p className="text-[11px] text-muted-foreground mb-0.5">Цена от</p>
        <p
          className={cn('text-xl font-bold tabular-nums leading-tight', isPriceFallbackText(priceText) && PRICE_ON_REQUEST_CLASS)}
          aria-label={priceAriaLabel(priceText)}
        >
          {priceText}
        </p>
        {!isPriceHidden(complex.priceTo) ? (
          <p className="text-xs text-muted-foreground mt-0.5">{formatDisplayPrice(complex.priceTo, { prefix: 'до' })}</p>
        ) : null}
      </div>

      <dl className="space-y-2 text-sm border-t border-border/60 pt-3">
        {st ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Статус</dt>
            <dd className="font-medium text-right">{st}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Сдача
          </dt>
          <dd className="font-medium text-right">{complex.deadline || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Застройщик
          </dt>
          <dd className="font-medium text-right truncate max-w-[55%]">{complex.builder || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Квартир</dt>
          <dd className="font-medium tabular-nums">{availableCount > 0 ? availableCount : '—'}</dd>
        </div>
      </dl>

      <div className="space-y-2 pt-1">
        <Button className="w-full h-10 text-sm font-semibold" type="button" onClick={onConsultation}>
          {CONVERSION_CTA.viewing}
        </Button>
        <Button variant="outline" className="w-full h-9 text-xs" asChild>
          <Link to={`/presentation/${complex.slug}`}>Презентация PDF</Link>
        </Button>
      </div>
    </aside>
  );
}
