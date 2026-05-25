import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';

/**
 * Shared typography + badge tokens for catalog cards and map sidebar rows.
 * Keeps hierarchy consistent without a component rewrite.
 */
export const cardVisual = {
  /** Highest — price emphasis */
  price: 'text-sm font-bold tabular-nums leading-tight text-primary',
  priceFallback: 'text-sm font-semibold tabular-nums leading-tight text-muted-foreground',
  priceGrid: 'text-[15px] font-bold tabular-nums leading-tight text-primary',
  priceGridFallback: 'text-[15px] font-semibold tabular-nums leading-tight text-muted-foreground',

  /** High — object title */
  title: 'text-sm font-semibold leading-snug text-foreground',
  titleGrid: 'text-[15px] font-semibold leading-snug text-foreground line-clamp-2',

  /** Medium — location / district */
  meta: 'text-[11px] text-muted-foreground leading-snug truncate',
  metaDot: 'text-[11px] text-muted-foreground/90 leading-snug line-clamp-1',

  /** Low — technical / counts */
  metaMuted: 'text-[10px] text-muted-foreground/75 leading-snug truncate',

  /** Map sidebar compact */
  sidebarRow: 'flex gap-2 p-1.5 rounded-lg border transition-colors min-w-0',
  sidebarThumb: 'w-12 shrink-0 rounded-md',
  sidebarPrice: 'text-xs font-bold tabular-nums leading-none',
  sidebarTitle: 'text-[11px] font-medium leading-snug line-clamp-2 text-foreground',
  sidebarMeta: 'text-[10px] text-muted-foreground/85 truncate leading-snug',

  /** Card shell */
  cardShell: 'rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm',
  cardBody: 'p-2.5 flex flex-col gap-1 min-w-0',
  cardBodyGrid: 'p-3 flex flex-col gap-1.5 min-w-0',

  /** ЖК marketplace card (Iter 87) */
  complexShell:
    'rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-md',
  complexMedia: 'relative shrink-0 overflow-hidden rounded-t-2xl bg-muted aspect-[16/10]',
  complexBody: 'flex flex-col gap-1.5 p-3 min-w-0',
  complexTitle: 'text-[15px] font-bold leading-snug text-foreground line-clamp-2',
  complexMetaRow: 'flex items-center gap-1.5 min-w-0 text-[11px] text-muted-foreground leading-snug',
  complexMetaIcon: 'w-3 h-3 shrink-0 text-muted-foreground/70',
  complexCompletion: 'text-[11px] font-semibold text-foreground leading-snug truncate',
  complexOverlayStack: 'absolute left-2 bottom-2 z-10 flex flex-col items-start gap-1 max-w-[calc(100%-3.5rem)]',
  complexOverlayPill:
    'rounded-md bg-background/92 px-2 py-0.5 text-[10px] font-medium leading-tight text-foreground shadow-sm backdrop-blur-sm',
  complexFooter: 'flex items-center justify-between gap-2 pt-2 mt-0.5 border-t border-border/60',
  complexFooterPill:
    'inline-flex items-center rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground',
  dottedLabel: 'text-[11px] text-muted-foreground leading-none',
  dottedPrice: 'text-[11px] font-semibold tabular-nums text-foreground leading-none',
  dottedBlock: 'flex flex-col gap-1 pt-1',
} as const;

type BadgeVariant = 'primary' | 'secondary' | 'outline';

const BADGE_BASE = 'inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-tight';

/** Normalized badge hierarchy — primary solid, secondary subtle, outline technical */
export function cardBadgeClass(variant: BadgeVariant, accent?: 'emerald' | 'amber' | 'blue' | 'green' | 'orange' | 'red' | 'muted'): string {
  if (variant === 'primary') {
    const map = {
      emerald: 'bg-emerald-600 text-white',
      amber: 'bg-amber-600 text-white',
      blue: 'bg-[#2563EB] text-white',
      green: 'bg-[#16A34A] text-white',
      orange: 'bg-[#EA580C] text-white',
      red: 'bg-red-600 text-white',
      muted: 'bg-muted text-muted-foreground',
    } as const;
    return cn(BADGE_BASE, map[accent ?? 'blue']);
  }
  if (variant === 'secondary') {
    const map = {
      emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
      amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      blue: 'bg-[#EFF6FF] text-[#2563EB]',
      green: 'bg-[#F0FDF4] text-[#16A34A]',
      orange: 'bg-[#FFF7ED] text-[#EA580C]',
      red: 'bg-red-50 text-red-800',
      muted: 'bg-muted/80 text-muted-foreground',
    } as const;
    return cn(BADGE_BASE, map[accent ?? 'muted']);
  }
  // outline — technical / inactive
  const map = {
    emerald: 'border border-emerald-200 text-emerald-700 bg-background',
    amber: 'border border-amber-200 text-amber-700 bg-background',
    blue: 'border border-blue-200 text-blue-700 bg-background',
    green: 'border border-green-200 text-green-700 bg-background',
    orange: 'border border-orange-200 text-orange-700 bg-background',
    red: 'border border-red-200 text-red-700 bg-background',
    muted: 'border border-border text-muted-foreground bg-background',
  } as const;
  return cn(BADGE_BASE, map[accent ?? 'muted']);
}

/** Join metadata fragments with middle dot — skips empty parts */
export function metaDotLine(parts: Array<string | null | undefined>): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(' · ');
}

/** Marketplace room band label for dotted price rows */
export function complexRoomBandLabel(rooms: number): string {
  if (rooms === 0) return 'Студии';
  if (rooms === 1) return '1-к.кв';
  if (rooms === 2) return '2Е-к.кв';
  if (rooms === 3) return '3-к.кв';
  return '4+ к.кв';
}

function capitalizeRuMonthYear(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const raw = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
}

/** Bottom-left overlay lines on ЖК cover (sales start + corpus hint) */
export function complexImageOverlayLines(complex: ResidentialComplex): {
  primary: string | null;
  secondary: string | null;
} {
  const hasStart = Boolean(complex.salesStartDate?.trim());
  const primary = hasStart ? 'Старт продаж' : null;
  let secondary: string | null = null;
  if (complex.salesStartDate) {
    const monthYear = capitalizeRuMonthYear(complex.salesStartDate);
    const corp = complex.buildings[0]?.name?.trim();
    if (monthYear && corp) secondary = `${monthYear} — ${corp}`;
    else if (monthYear) secondary = monthYear;
  }
  if (!primary && complex.status === 'planned') {
    return { primary: 'Планируется', secondary };
  }
  return { primary, secondary };
}

/** Emphasized completion / delivery line under metadata */
export function complexCompletionLine(complex: ResidentialComplex): string | null {
  const dl = complex.deadline?.trim();
  if (!dl || dl === '—') return null;
  if (complex.status === 'completed') {
    if (dl === 'Сдан') return 'Сдан';
    return dl.toLowerCase().startsWith('сдан') ? dl : `Сдан — ${dl}`;
  }
  if (complex.status === 'building') {
    if (dl === 'Строится') return 'Строится';
    return dl.toLowerCase().startsWith('строит') ? dl : `Строится — ${dl}`;
  }
  if (complex.status === 'planned') {
    return dl === 'Проект' ? 'Проект' : `Проект — ${dl}`;
  }
  return dl;
}

export function complexMetroTimeLabel(
  distanceTime: number | null | undefined,
  distanceType?: 1 | 2 | null,
): string {
  if (distanceTime == null || distanceTime <= 0) return '';
  const mode = distanceType === 1 ? 'пешком' : 'транспортом';
  return `${distanceTime} мин ${mode}`;
}
