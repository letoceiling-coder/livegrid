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
        'rounded-2xl border border-border/60 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-4',
        className,
      )}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-medium">Цена от</p>
        <p
          className={cn('text-2xl font-bold tabular-nums leading-tight', isPriceFallbackText(priceText) && PRICE_ON_REQUEST_CLASS)}
          aria-label={priceAriaLabel(priceText)}
        >
          {priceText}
        </p>
        {!isPriceHidden(complex.priceTo) ? (
          <p className="text-xs text-muted-foreground mt-0.5">{formatDisplayPrice(complex.priceTo, { prefix: 'до' })}</p>
        ) : null}
      </div>

      <dl className="space-y-2.5 text-sm border-t border-border/50 pt-4">
        {st ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Статус</dt>
            <dd className="font-medium text-right">{st}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" /> Сдача
          </dt>
          <dd className="font-medium text-right">{complex.deadline || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0" /> Застройщик
          </dt>
          <dd className="font-medium text-right truncate max-w-[55%]">{complex.builder || '—'}</dd>
        </div>
        {availableCount > 0 ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Свободных кв.</dt>
            <dd className="font-semibold tabular-nums text-emerald-600">{availableCount}</dd>
          </div>
        ) : null}
      </dl>

      <div className="space-y-2 pt-0.5">
        <Button className="w-full h-11 text-sm font-semibold" type="button" onClick={onConsultation}>
          {CONVERSION_CTA.viewing}
        </Button>
        <Button variant="outline" className="w-full h-9 text-xs gap-1.5" asChild>
          <Link to={`/presentation/${complex.slug}`}>Презентация PDF</Link>
        </Button>
      </div>
    </aside>
  );
}
