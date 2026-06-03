import { describe, expect, it } from 'vitest';
import {
  isMortgageCalculatorPlatformTool,
  normalizePlatformToolsSettings,
} from '@/shared/lib/platform-tools-cms';

describe('platform-tools-cms', () => {
  it('strips legacy mortgage calculator item', () => {
    const settings = normalizePlatformToolsSettings({
      title: 'Дополнительные возможности',
      items: [
        { title: 'Ипотечный калькулятор', button: 'Рассчитаем ипотеку', action: 'calc', enabled: true },
        { title: 'Индивидуальный подбор', button: 'Помощь', action: 'modal', enabled: true },
      ],
    });
    expect(settings.items.some((i) => isMortgageCalculatorPlatformTool(i))).toBe(false);
    expect(settings.items.some((i) => i.title.includes('подбор'))).toBe(true);
  });

  it('detects mortgage calculator variants', () => {
    expect(
      isMortgageCalculatorPlatformTool({
        title: 'Ипотечный калькулятор',
        description: '',
        link: '/catalog',
        icon: 'calculator',
      }),
    ).toBe(true);
    expect(
      isMortgageCalculatorPlatformTool({
        title: 'Каталог',
        description: '',
        link: '/catalog',
        icon: 'building2',
      }),
    ).toBe(false);
  });
});
