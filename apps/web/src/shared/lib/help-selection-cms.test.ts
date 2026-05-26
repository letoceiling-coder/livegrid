import { describe, it, expect } from 'vitest';
import { isHelpConsultUrl, normalizeHelpSelectionSettings } from '@/shared/lib/help-selection-cms';
import { normalizePlatformToolsSettings, sortedEnabledTools } from '@/shared/lib/platform-tools-cms';

describe('help-selection-cms', () => {
  it('detects consult url', () => {
    expect(isHelpConsultUrl('#consult')).toBe(true);
    expect(isHelpConsultUrl('/catalog')).toBe(false);
  });
});

describe('platform-tools-cms', () => {
  it('migrates legacy action to link', () => {
    const s = normalizePlatformToolsSettings({
      items: [{ title: 'A', button: 'Go', action: 'auth' }],
    });
    expect(s.items[0].link).toBe('/login');
  });

  it('filters disabled tools', () => {
    const s = normalizePlatformToolsSettings({
      items: [
        { title: 'On', description: 'd', enabled: true, order: 0 },
        { title: 'Off', description: 'd', enabled: false, order: 1 },
      ],
    });
    expect(sortedEnabledTools(s)).toHaveLength(1);
  });
});
