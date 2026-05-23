import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  message: string;
  className?: string;
  compact?: boolean;
  onRetry?: () => void;
};

/** Subtle CRM error banner — partial render safe. */
export default function CrmInlineError({ message, className, compact, onRetry }: Props) {
  return (
    <div
      className={cn(
        'rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100',
        compact ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-2',
        onRetry ? 'flex items-center justify-between gap-2' : compact ? '' : 'text-center',
        className,
      )}
      role="status"
    >
      <p className={cn(!onRetry && !compact && 'w-full text-center')}>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 px-2 py-1 text-[10px] font-medium hover:bg-amber-500/10"
        >
          <RefreshCw className="w-3 h-3" />
          Повторить
        </button>
      ) : null}
    </div>
  );
}
