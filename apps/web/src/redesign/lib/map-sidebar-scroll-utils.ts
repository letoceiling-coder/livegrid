/**
 * Sidebar scroll hardening helpers — production-safe defaults, DEV-aware behavior.
 */

/** Respect OS reduced-motion for programmatic scroll */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type ScrollToIndexBehavior = 'auto' | 'smooth';

/** Scroll behavior for selection sync — instant when reduced motion */
export function sidebarScrollBehavior(): ScrollToIndexBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Skip smooth scroll when selections arrive faster than momentum settles.
 * Prevents scrollToIndex queue stacking during rapid marker clicks.
 */
export function shouldCoalesceSelectionScroll(
  lastScrollAtMs: number,
  nowMs: number = performance.now(),
): boolean {
  return nowMs - lastScrollAtMs < 280;
}

export function sidebarScrollIntoViewOptions(): ScrollIntoViewOptions {
  return {
    block: 'nearest',
    behavior: sidebarScrollBehavior(),
  };
}
