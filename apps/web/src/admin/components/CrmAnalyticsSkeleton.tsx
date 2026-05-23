import { Loader2 } from 'lucide-react';

/** Stable skeleton for analytics hydration — no layout jump (Iter 43) */
export default function CrmAnalyticsSkeleton() {
  return (
    <div
      className="rounded-xl border bg-card p-4 mb-6 space-y-3 animate-pulse"
      aria-busy="true"
      aria-label="Загрузка аналитики"
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-muted" />
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/60" />
        ))}
      </div>
      <div className="h-32 rounded-lg bg-muted/40" />
      <div className="h-24 rounded-lg bg-muted/30" />
    </div>
  );
}
