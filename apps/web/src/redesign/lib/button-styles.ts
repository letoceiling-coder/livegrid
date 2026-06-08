import { cn } from '@/lib/utils';

/** Unified site-wide button tokens — PRIMARY / SECONDARY / GHOST */
export const buttonStyles = {
  base: 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:opacity-50 disabled:pointer-events-none',
  primary:
    'bg-[#2563EB] text-white hover:bg-[#1d4ed8] h-12 min-h-12 px-6 text-base',
  secondary:
    'bg-white text-[#111827] border-[1.5px] border-[#d1d5db] hover:bg-[#f9fafb] h-12 min-h-12 px-6 text-base',
  ghost: 'bg-transparent text-[#2563EB] hover:text-[#1d4ed8] h-auto min-h-0 px-0 text-base font-semibold border-0',
  /** Full-width on mobile when in a block */
  block: 'w-full sm:w-auto',
  compact: 'h-10 min-h-10 px-4 text-sm font-medium',
} as const;

export function btnClass(
  variant: 'primary' | 'secondary' | 'ghost',
  opts?: { block?: boolean; compact?: boolean; className?: string },
): string {
  const v =
    variant === 'primary'
      ? buttonStyles.primary
      : variant === 'secondary'
        ? buttonStyles.secondary
        : buttonStyles.ghost;
  return cn(
    buttonStyles.base,
    v,
    opts?.compact && buttonStyles.compact,
    opts?.block && buttonStyles.block,
    opts?.className,
  );
}
