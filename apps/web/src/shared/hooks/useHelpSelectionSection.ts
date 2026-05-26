import { useMemo } from 'react';
import { useContentStore } from '@/admin/store/content-store';
import { normalizeHelpSelectionSettings, type HelpSelectionSettings } from '@/shared/lib/help-selection-cms';

export function useHelpSelectionSection(pageSlug: string) {
  const pages = useContentStore((s) => s.pages);
  return useMemo(() => {
    const page = pages.find((p) => p.slug === pageSlug);
    if (!page) return null;
    const section = page.sections.find((s) => s.type === 'help_selection');
    if (!section || !section.is_active) return null;
    return { settings: normalizeHelpSelectionSettings(section.settings) as HelpSelectionSettings };
  }, [pages, pageSlug]);
}
