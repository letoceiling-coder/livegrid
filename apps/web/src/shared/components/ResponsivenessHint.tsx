import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

type HintPayload = {
  hint: { show: boolean; label: string; expectation: string } | null;
  expectationDefault: string;
};

type Props = {
  className?: string;
  compact?: boolean;
};

export default function ResponsivenessHint({ className, compact }: Props) {
  const query = useQuery({
    queryKey: ['stats', 'responsiveness-hint'],
    queryFn: () => apiGet<HintPayload>('/stats/responsiveness-hint'),
    staleTime: 300_000,
  });

  const hint = query.data?.hint;
  if (!hint?.show) return null;

  if (compact) {
    return (
      <p className={cn('text-xs text-muted-foreground flex items-center gap-1.5', className)}>
        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{hint.label}</span>
      </p>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <p className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-0.5">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {hint.label}
      </p>
      <p>{hint.expectation}</p>
    </div>
  );
}
