import { useCallback, useLayoutEffect, useRef } from 'react';
import {
  incrementSidebarVirtualizerRecalc,
  isMapDebugEnabled,
  recordSidebarMetrics,
} from '@/redesign/lib/map-render-observability';
import {
  MAP_SIDEBAR_ROW_HEIGHT,
  estimateSidebarVisibleRows,
  resolveSidebarOverscan,
} from '@/redesign/lib/map-sidebar-layout';

type VirtualItem = { index: number; key: string | number };

type Options = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  virtualItems: VirtualItem[];
  totalRows: number;
  activeIndex: number;
  enabled: boolean;
};

function virtualItemsSignature(items: VirtualItem[]): string {
  if (!items.length) return '';
  return `${items[0]!.index}-${items[items.length - 1]!.index}-${items.length}`;
}

function detectClippingWarnings(container: HTMLElement): string {
  const warnings: string[] = [];
  const rows = container.querySelectorAll<HTMLElement>('[data-sidebar-row]');

  rows.forEach((row) => {
    const idx = row.dataset.sidebarIndex ?? '?';
    const rowRect = row.getBoundingClientRect();
    if (rowRect.height > MAP_SIDEBAR_ROW_HEIGHT + 2) {
      warnings.push(`row#${idx}:height=${Math.round(rowRect.height)}px`);
    }
    const title = row.querySelector<HTMLElement>('[data-sidebar-title]');
    if (title && title.scrollHeight > title.clientHeight + 1) {
      warnings.push(`row#${idx}:title-clipped`);
    }
    const button = row.querySelector<HTMLElement>('button');
    if (button && button.scrollHeight > button.clientHeight + 1) {
      warnings.push(`row#${idx}:button-overflow`);
    }
  });

  return warnings.slice(0, 4).join('; ');
}

/**
 * DEV-only sidebar virtualizer instrumentation — tree-shaken when import.meta.env.DEV is false.
 */
export function useSidebarVirtualizerDebug({
  scrollRef,
  virtualItems,
  totalRows,
  activeIndex,
  enabled,
}: Options): void {
  const prevSigRef = useRef('');
  const fpsFramesRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const scrollingRef = useRef(false);

  const publish = useCallback(
    (scrollFps?: number, clippingWarnings?: string) => {
      if (!import.meta.env.DEV || !enabled || !isMapDebugEnabled()) return;
      const el = scrollRef.current;
      const viewportH = el?.clientHeight ?? 0;
      const visibleRows = estimateSidebarVisibleRows(viewportH);
      const rendered = virtualItems.length;
      const overscan = resolveSidebarOverscan();

      recordSidebarMetrics({
        totalRows,
        renderedRows: rendered,
        visibleRows,
        overscan,
        activeIndex,
        scrollTop: el?.scrollTop ?? 0,
        scrollFps,
        clippingWarnings,
      });
    },
    [scrollRef, virtualItems.length, totalRows, activeIndex, enabled],
  );

  useLayoutEffect(() => {
    if (!import.meta.env.DEV || !enabled || !isMapDebugEnabled()) return;

    const sig = virtualItemsSignature(virtualItems);
    if (sig !== prevSigRef.current) {
      prevSigRef.current = sig;
      incrementSidebarVirtualizerRecalc();
    }

    const clipping = scrollRef.current ? detectClippingWarnings(scrollRef.current) : '';
    publish(undefined, clipping);
  }, [virtualItems, enabled, publish, scrollRef]);

  useLayoutEffect(() => {
    if (!import.meta.env.DEV || !enabled || !isMapDebugEnabled()) return;
    const el = scrollRef.current;
    if (!el) return;

    let lastFrame = performance.now();

    const onScroll = () => {
      scrollingRef.current = true;
      publish();

      if (rafRef.current == null) {
        const tick = (now: number) => {
          if (!scrollingRef.current) {
            rafRef.current = null;
            return;
          }
          const delta = now - lastFrame;
          lastFrame = now;
          if (delta > 0) {
            const fps = 1000 / delta;
            const frames = fpsFramesRef.current;
            frames.push(fps);
            if (frames.length > 12) frames.shift();
            const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
            publish(Math.round(avg));
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const onScrollEnd = () => {
      scrollingRef.current = false;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd, { passive: true });

    publish();

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      fpsFramesRef.current = [];
    };
  }, [enabled, publish, scrollRef]);
}
