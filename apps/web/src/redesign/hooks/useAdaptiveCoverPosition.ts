import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeArchitecturalCoverPosition,
  shouldUseContainForHero,
} from '@/redesign/lib/hero-composition';

type Result = {
  objectPosition: string;
  useContain: boolean;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export function useAdaptiveCoverPosition(src: string | null | undefined, enabled: boolean): Result {
  const containerRef = useRef<HTMLDivElement>(null);
  const [objectPosition, setObjectPosition] = useState('center center');
  const [useContain, setUseContain] = useState(false);

  const measure = useCallback((img: HTMLImageElement) => {
    const container = containerRef.current;
    if (!container || !img.naturalWidth || !img.naturalHeight) return;

    if (shouldUseContainForHero(img.naturalWidth, img.naturalHeight)) {
      setUseContain(true);
      setObjectPosition('center center');
      return;
    }

    setUseContain(false);
    const { width, height } = container.getBoundingClientRect();
    setObjectPosition(
      computeArchitecturalCoverPosition(img.naturalWidth, img.naturalHeight, width, height),
    );
  }, []);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (!enabled) return;
      measure(e.currentTarget);
    },
    [enabled, measure],
  );

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      const img = container.querySelector('img');
      if (img instanceof HTMLImageElement && img.naturalWidth > 0) {
        measure(img);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [enabled, measure, src]);

  useEffect(() => {
    setObjectPosition('center center');
    setUseContain(false);
  }, [src]);

  return { objectPosition, useContain, onImageLoad, containerRef };
}
