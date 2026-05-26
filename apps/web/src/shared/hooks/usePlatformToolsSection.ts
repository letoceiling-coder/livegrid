import { useMemo } from 'react';
import { useContentStore } from '@/admin/store/content-store';
import { normalizePlatformToolsSettings, type PlatformToolsSettings } from '@/shared/lib/platform-tools-cms';

export function usePlatformToolsSection(pageSlug: string) {
  const pages = useContentStore((s) => s.pages);
  return useMemo(() => {
    const page = pages.find((p) => p.slug === pageSlug);
    if (!page) return null;
    const section = page.sections.find((s) => s.type === 'additional_features');
    if (!section || !section.is_active) return null;
    return { settings: normalizePlatformToolsSettings(section.settings) };
  }, [pages, pageSlug]);
}
