import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import StableMediaFrame from '@/redesign/components/StableMediaFrame';
import { useAdaptiveCoverPosition } from '@/redesign/hooks/useAdaptiveCoverPosition';
import {
  COMPLEX_GALLERY_THUMB_CLASS,
  COMPLEX_GALLERY_THUMB_SIZE_CLASS,
  COMPLEX_GALLERY_VIEWPORT_CLASS,
  computeArchitecturalCoverPosition,
} from '@/redesign/lib/hero-composition';
import { prefersReducedMotion } from '@/redesign/lib/map-sidebar-scroll-utils';

type Props = {
  images: string[];
  title: string;
};

function GalleryThumbnail({
  src,
  active,
  animate,
  index,
  onSelect,
  onHover,
}: {
  src: string;
  active: boolean;
  animate: boolean;
  index: number;
  onSelect: () => void;
  onHover: () => void;
}) {
  const [thumbPosition, setThumbPosition] = useState('center center');

  const handleThumbLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const box = img.parentElement?.getBoundingClientRect();
    if (!img.naturalWidth || !box) return;
    setThumbPosition(
      computeArchitecturalCoverPosition(img.naturalWidth, img.naturalHeight, box.width, box.height),
    );
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        COMPLEX_GALLERY_THUMB_CLASS,
        COMPLEX_GALLERY_THUMB_SIZE_CLASS,
        'border-2 transition-all duration-200',
        active ? 'border-primary shadow-sm ring-1 ring-primary/20' : 'border-transparent opacity-80 hover:opacity-100',
        !animate && 'transition-none',
      )}
      aria-label={`Фото ${index + 1}`}
      aria-current={active}
    >
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: thumbPosition }}
        loading="lazy"
        onLoad={handleThumbLoad}
      />
    </button>
  );
}

export default function ComplexPremiumGallery({ images, title }: Props) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const hasImages = images.length > 0;
  const animate = !prefersReducedMotion();
  const currentSrc = hasImages ? images[idx] : null;

  const { objectPosition, useContain, onImageLoad, containerRef } = useAdaptiveCoverPosition(
    currentSrc,
    hasImages,
  );

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
      <section
        id="gallery"
        className="scroll-mt-28 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
      >
        <div
          ref={containerRef}
          className={COMPLEX_GALLERY_VIEWPORT_CLASS}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <StableMediaFrame
            src={currentSrc}
            altContext={title}
            aspect="none"
            fallback="branded"
            loading="eager"
            className="absolute inset-0 h-full w-full"
            imgClassName={cn(
              'h-full w-full transition-opacity duration-200',
              useContain ? 'object-contain' : 'object-cover',
            )}
            imgStyle={useContain ? undefined : { objectPosition }}
            onImageLoad={onImageLoad}
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
          <div className="flex gap-2 overflow-x-auto border-t border-border/50 bg-muted/15 px-2.5 py-2.5 scrollbar-hide sm:gap-2.5 sm:px-3">
            {images.map((src, i) => (
              <GalleryThumbnail
                key={`${src}-${i}`}
                src={src}
                active={i === idx}
                animate={animate}
                index={i}
                onSelect={() => setIdx(i)}
                onHover={() => setIdx(i)}
              />
            ))}
          </div>
        ) : null}
      </section>

      {lightbox && hasImages ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button type="button" className="absolute inset-0" aria-label="Закрыть" onClick={() => setLightbox(false)} />
          <div className="relative z-10 w-full max-w-5xl rounded-2xl bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-medium truncate">{title}</p>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setLightbox(false)}
              >
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
