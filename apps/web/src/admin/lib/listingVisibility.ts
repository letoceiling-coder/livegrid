import type { ListingVisibility } from '@lg/shared';

export const LISTING_VISIBILITY_TABS: Array<{ key: ListingVisibility | 'all'; label: string }> = [
  { key: 'PUBLIC', label: 'Активные' },
  { key: 'DRAFT', label: 'Черновики' },
  { key: 'REVIEW', label: 'На модерации' },
  { key: 'REJECTED', label: 'Отклонённые' },
  { key: 'HIDDEN', label: 'Скрытые' },
  { key: 'ARCHIVED', label: 'Архив' },
];

export const LISTING_VISIBILITY_LABEL: Record<ListingVisibility, string> = {
  PUBLIC: 'Опубликовано',
  HIDDEN: 'Скрыто',
  ARCHIVED: 'Архив',
  DRAFT: 'Черновик',
  REVIEW: 'На модерации',
  REJECTED: 'Отклонено',
};

export function listingVisibilityClass(v: string): string {
  switch (v) {
    case 'PUBLIC':
      return 'bg-emerald-100 text-emerald-800';
    case 'HIDDEN':
      return 'bg-amber-100 text-amber-800';
    case 'ARCHIVED':
      return 'bg-muted text-muted-foreground';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700';
    case 'REVIEW':
      return 'bg-blue-100 text-blue-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
