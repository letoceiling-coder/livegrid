import { useMemo } from 'react';
import { useContentStore } from '@/admin/store/content-store';
import {
  normalizeAboutPlatformSettings,
  type AboutPlatformSettings,
} from '@/shared/lib/about-platform-cms';

export type AboutPlatformSectionState = {
  active: boolean;
  settings: AboutPlatformSettings;
};

export function useAboutPlatformSection(pageSlug: string): AboutPlatformSectionState | null {
  const pages = useContentStore((s) => s.pages);

  return useMemo(() => {
    const page = pages.find((p) => p.slug === pageSlug);
    if (!page) return null;
    const section = page.sections.find((s) => s.type === 'about_platform');
    if (!section || !section.is_active) return null;
    return {
      active: true,
      settings: normalizeAboutPlatformSettings(section.settings),
    };
  }, [pages, pageSlug]);
}
