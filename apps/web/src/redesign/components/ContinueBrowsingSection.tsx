import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import { useBrowseHistory } from '@/shared/hooks/useBrowseHistory';
import { cn } from '@/lib/utils';

type Props = {
  title?: string;
  className?: string;
  limit?: number;
};

export default function ContinueBrowsingSection({
  title = 'Продолжить просмотр',
  className,
  limit = 8,
}: Props) {
  const { items, isLoading, hasHistory } = useBrowseHistory(limit);

  if (isLoading || !hasHistory) return null;

  return (
    <section className={cn('space-y-3', className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {title}
        </h2>
        <Link
          to="/account/history"
          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-0.5"
        >
          Вся история
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {items.map((row) => (
          <Link
            key={row.id}
            to={row.href}
            className="snap-start shrink-0 w-[200px] sm:w-[220px] rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
          >
            <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{row.title}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {row.entityKind === 'BLOCK' ? 'ЖК' : 'Объект'} ·{' '}
              {new Date(row.viewedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
