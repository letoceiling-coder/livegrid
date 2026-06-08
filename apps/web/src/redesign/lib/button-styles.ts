import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

/** Computed hex for `--primary` (206 89% 60%) — login button «Войти» */
export const BRAND_PRIMARY_HEX = '#3EA5F4';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export function btnClass(
  variant: ButtonVariant,
  opts?: { block?: boolean; size?: ButtonSize; className?: string },
): string {
  const size = opts?.size ?? 'md';
  const mappedVariant = variant === 'primary' ? 'primary' : variant === 'secondary' ? 'secondary' : 'ghost';
  return cn(
    buttonVariants({ variant: mappedVariant, size: size === 'sm' ? 'sm' : 'md' }),
    opts?.block && 'w-full sm:w-auto',
    opts?.className,
  );
}
