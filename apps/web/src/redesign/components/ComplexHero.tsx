import { useState } from 'react';
import {
  MapPin,
  Building2,
  CalendarDays,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPriceFrom, priceAriaLabel } from '@/redesign/lib/display-price';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import ConversionCTABar from '@/redesign/components/ConversionCTABar';
import ConsultationFlow from '@/redesign/components/ConsultationFlow';
import { CONVERSION_CTA, type ConsultationContext } from '@/redesign/lib/conversion-cta';

const ComplexHero = ({ complex, blockId }: { complex: ResidentialComplex; blockId?: number }) => {
  const totalApts =
    complex.listingCount ??
    complex.buildings.reduce((s, b) => s + b.apartments.filter((a) => a.status === 'available').length, 0);
  const [imgIdx, setImgIdx] = useState(0);
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultContext, setConsultContext] = useState<ConsultationContext | null>(null);
  const hasImages = complex.images.length > 0;

  const baseContext: ConsultationContext = {
    surface: 'complex',
    source: `complex:${complex.slug}`,
    blockId,
    contextFooter: `Запрос с карточки ЖК «${complex.name}»`,
  };

  const openConsultation = (ctx: ConsultationContext) => {
    setConsultContext(ctx);
    setConsultOpen(true);
  };

  return (
    <div className="space-y-0">
      <section id="gallery" className="scroll-mt-28 rounded-2xl overflow-hidden border border-border bg-card">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-[420px] bg-muted">
          <StableMediaFrame
            src={hasImages ? complex.images[imgIdx] : null}
            altContext={complex.name}
            aspect="none"
            fallback="branded"
            loading="eager"
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
          />

          {complex.images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i - 1 + complex.images.length) % complex.images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i + 1) % complex.images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                aria-label="Следующее фото"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {complex.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImgIdx(i)}
                    aria-label={`Фото ${i + 1}`}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      i === imgIdx ? 'w-5 bg-primary' : 'w-2 bg-primary/40',
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section id="header-meta" className="scroll-mt-28 mt-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          {complex.status === 'completed' ? (
            <span className="px-2.5 py-1 bg-green-500/15 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
              Сдан
            </span>
          ) : null}
          {complex.status === 'building' ? (
            <span className="px-2.5 py-1 bg-primary/15 text-primary rounded-full text-xs font-medium">
              Строится
            </span>
          ) : null}
          {complex.status === 'planned' ? (
            <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
              Планируется
            </span>
          ) : null}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{complex.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              {complex.address || '—'}
            </span>
            {complex.subway && complex.subway !== '—' ? (
              <span>
                м. {complex.subway}
                {complex.subwayDistance && complex.subwayDistance !== '—' ? ` · ${complex.subwayDistance}` : ''}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Цена от</p>
            <p className="font-bold text-lg sm:text-xl" aria-label={priceAriaLabel(formatPriceFrom(complex.priceFrom))}>
              {formatPriceFrom(complex.priceFrom)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Застройщик</p>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{complex.builder || '—'}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Сдача</p>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              {complex.deadline || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Квартир</p>
            <p className="font-semibold text-sm">{totalApts > 0 ? `${totalApts} доступно` : '—'}</p>
          </div>
        </div>

        {complex.advantages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {complex.advantages.map((a, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Shield className="w-3 h-3 shrink-0" />
                {a}
              </span>
            ))}
          </div>
        ) : null}

        <ConversionCTABar
          layout="row"
          context={baseContext}
          onConsultation={openConsultation}
          consultationLabel={CONVERSION_CTA.viewing}
        />
      </section>

      <ConsultationFlow open={consultOpen} onOpenChange={setConsultOpen} context={consultContext} />
    </div>
  );
};

export default ComplexHero;
