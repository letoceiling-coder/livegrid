import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  className?: string;
  compact?: boolean;
};

/** Consistent admin loading — spinner + optional label. */
export default function AdminLoadingState({ label = 'Загрузка…', className, compact }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-muted-foreground',
        compact ? 'py-6 gap-2' : 'py-16 gap-3',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('animate-spin text-primary', compact ? 'w-5 h-5' : 'w-6 h-6')} />
      <p className={cn(compact ? 'text-xs' : 'text-sm')}>{label}</p>
    </div>
  );
}
