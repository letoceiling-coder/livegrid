import { describe, it, expect } from 'vitest';
import { normalizeAboutPlatformSettings, sortedEnabledStats } from '@/shared/lib/about-platform-cms';

describe('about-platform-cms', () => {
  it('normalizes legacy subtitle into eyebrow', () => {
    const s = normalizeAboutPlatformSettings({ subtitle: 'Legacy eyebrow', title: 'T', description: 'D' });
    expect(s.eyebrow).toBe('Legacy eyebrow');
  });

  it('filters disabled stats', () => {
    const s = normalizeAboutPlatformSettings({
      stats: [
        { value: '1', label: 'a', enabled: true, order: 0 },
        { value: '2', label: 'b', enabled: false, order: 1 },
      ],
    });
    expect(sortedEnabledStats(s)).toHaveLength(1);
  });
});
