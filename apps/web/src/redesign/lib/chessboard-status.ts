import type { Apartment } from '@/redesign/data/types';

export type ChessStatusKey = Apartment['status'];

/** Visual states rendered on the chess grid (includes filter + selection overlays). */
export type ChessVisualState = ChessStatusKey | 'hidden' | 'selected';

export const CHESS_STATUS_ORDER: ChessStatusKey[] = ['available', 'reserved', 'sold'];

export const CHESS_STATUS_LABEL: Record<ChessStatusKey, string> = {
  available: 'Свободна',
  reserved: 'Бронь',
  sold: 'Продана',
};

/**
 * Palette rationale (TrendAgent / Domclick / Cian new-build alignment):
 * - AVAILABLE: white surface + subtle border — primary conversion target
 * - RESERVED: amber wash — visible but de-emphasized vs available
 * - SOLD: near-black — clearly non-actionable, high contrast label
 * - HIDDEN: opacity only — filtered by legend or room filter, not a listing status
 * - SELECTED: primary ring — matches site CTA / apartment page focus
 */
export const CHESS_CELL_CLASS: Record<ChessVisualState, string> = {
  available:
    'bg-background text-foreground border-border shadow-sm hover:border-primary/50 hover:shadow-md',
  reserved:
    'bg-amber-500/10 text-foreground border-amber-500/30 hover:border-amber-600/50',
  sold: 'bg-neutral-900 text-neutral-100 border-neutral-900 cursor-default',
  hidden: 'opacity-30 pointer-events-none',
  selected:
    'bg-primary/5 text-foreground border-primary ring-2 ring-primary/40 shadow-md z-[1]',
};

export const CHESS_SWATCH_CLASS: Record<ChessStatusKey, string> = {
  available: 'bg-background border-border',
  reserved: 'bg-amber-500/25 border-amber-500/50',
  sold: 'bg-neutral-900 border-neutral-900',
};

export function resolveChessVisualState(
  status: ChessStatusKey,
  opts: { hidden?: boolean; selected?: boolean },
): ChessVisualState {
  if (opts.selected && status !== 'sold') return 'selected';
  if (opts.hidden) return 'hidden';
  return status;
}

export function isChessCellInteractive(status: ChessStatusKey, hidden: boolean): boolean {
  return !hidden && status !== 'sold';
}
