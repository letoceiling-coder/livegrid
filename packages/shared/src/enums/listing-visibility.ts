export const LISTING_VISIBILITY = ['PUBLIC', 'HIDDEN', 'ARCHIVED', 'DRAFT'] as const;
export type ListingVisibility = (typeof LISTING_VISIBILITY)[number];

export const LISTING_VISIBILITY_LABEL: Record<ListingVisibility, string> = {
  PUBLIC: 'Опубликовано',
  HIDDEN: 'Скрыто',
  ARCHIVED: 'Архив',
  DRAFT: 'Черновик',
};
