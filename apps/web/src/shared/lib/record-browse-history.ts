import { pushLocalBrowseHistory, blockHref, listingHref } from '@/shared/lib/browse-history-local';
import { patchSessionSnapshot } from '@/shared/lib/session-continuity';
import { canCallAccountApi } from '@/shared/lib/auth-guards';
import { apiPost } from '@/lib/api';

/** Record browse event — local always; server only when JWT present (Iter 85). */
export async function recordBrowseHistory(
  entityKind: 'LISTING' | 'BLOCK',
  entityId: number,
  title?: string,
  href?: string,
): Promise<void> {
  const path =
    href ?? (entityKind === 'BLOCK' ? blockHref(entityId) : listingHref(entityId));

  pushLocalBrowseHistory({
    entityKind,
    entityId,
    title,
    href: path,
  });

  if (entityKind === 'LISTING') {
    patchSessionSnapshot({
      lastListingHref: path,
      lastListingTitle: title,
    });
  }

  if (!canCallAccountApi()) return;

  try {
    await apiPost('/account/history', { entityKind, entityId, title });
  } catch {
    /* network error — local history already saved */
  }
}
