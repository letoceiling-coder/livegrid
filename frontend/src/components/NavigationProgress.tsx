import { useLocation } from 'react-router-dom';

/**
 * Тонкая полоса сверху при переходе между страницами (lazy chunks + смена URL).
 */
export default function NavigationProgress() {
  const { pathname, search, hash } = useLocation();
  const key = `${pathname}${search}${hash}`;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none overflow-hidden"
      aria-hidden
    >
      <div
        key={key}
        className="h-full w-full origin-left bg-primary/90 animate-route-progress shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
      />
    </div>
  );
}
