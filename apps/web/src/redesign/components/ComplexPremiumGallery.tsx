import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import { COMPLEX_HERO_IMG_CLASS } from '@/redesign/lib/image-media';
import { prefersReducedMotion } from '@/redesign/lib/map-sidebar-scroll-utils';

type Props = {
  images: string[];
  title: string;
};

export default function ComplexPremiumGallery({ images, title }: Props) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const hasImages = images.length > 0;
  const animate = !prefersReducedMotion();

  const prev = useCallback(() => {
    if (images.length <= 1) return;
    setIdx((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    if (images.length <= 1) return;
    setIdx((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, prev, next]);

  let touchStartX = 0;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0]?.clientX ?? 0;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next();
    else prev();
  };

  return (
    <>
      <section id="gallery" className="scroll-mt-28 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div
          className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[min(440px,58vh)] bg-muted"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <StableMediaFrame
            src={hasImages ? images[idx] : null}
            altContext={title}
            aspect="none"
            fallback="branded"
            loading="eager"
            className="h-full w-full"
            imgClassName={COMPLEX_HERO_IMG_CLASS}
          />
          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:left-3"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-background sm:right-3"
                aria-label="Следующее фото"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-border/60 bg-background/90 px-2 py-1 text-[11px] font-medium backdrop-blur-sm hover:bg-background sm:right-3 sm:top-3 sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">На весь экран</span>
              </button>
            </>
          ) : null}
        </div>
        {images.length > 1 ? (
          <div className="flex gap-1.5 overflow-x-auto border-t border-border/60 bg-muted/20 p-2 scrollbar-hide">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                onMouseEnter={() => setIdx(i)}
                className={cn(
                  'relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 sm:h-16 sm:w-24',
                  i === idx ? 'border-primary shadow-sm' : 'border-transparent opacity-75 hover:opacity-100',
                  !animate && 'transition-none',
                )}
                aria-label={`Фото ${i + 1}`}
                aria-current={i === idx}
              >
                <img src={src} alt="" className={COMPLEX_HERO_IMG_CLASS} loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {lightbox && hasImages ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-6" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" aria-label="Закрыть" onClick={() => setLightbox(false)} />
          <div className="relative z-10 w-full max-w-5xl rounded-2xl bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-medium truncate">{title}</p>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setLightbox(false)}>
                Закрыть
              </button>
            </div>
            <img src={images[idx]} alt={title} className="max-h-[82vh] w-full rounded-xl object-contain" />
            {images.length > 1 ? (
              <div className="mt-2 flex justify-center gap-2">
                <button type="button" onClick={prev} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  Назад
                </button>
                <span className="self-center text-xs text-muted-foreground tabular-nums">
                  {idx + 1} / {images.length}
                </span>
                <button type="button" onClick={next} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  Далее
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
