import { cn } from '@/lib/utils';

type Tone = 'ok' | 'warn' | 'error' | 'neutral';

const toneClass: Record<Tone, string> = {
  ok: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  warn: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

type Props = {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
};

/** Unified operational status chip for admin panels. */
export default function AdminStatusBadge({ children, tone = 'neutral', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
