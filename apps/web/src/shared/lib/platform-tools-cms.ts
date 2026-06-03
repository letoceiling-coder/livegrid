export type PlatformToolItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
  enabled: boolean;
  order: number;
};

export type PlatformToolsSettings = {
  title: string;
  items: PlatformToolItem[];
};

const ACTION_LINKS: Record<string, string> = {
  calc: '/catalog',
  modal: '#consult',
  catalog: '/catalog',
  auth: '/login',
};

function itemId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

/** Task 7.3 — mortgage calculator removed from «Дополнительные возможности». */
export function isMortgageCalculatorPlatformTool(item: Pick<PlatformToolItem, 'title' | 'description' | 'link' | 'icon'>): boolean {
  const title = item.title.trim().toLowerCase();
  const desc = item.description.trim().toLowerCase();
  const link = item.link.trim().toLowerCase();
  if (link === '/mortgage' || link.includes('/mortgage')) return true;
  if (title.includes('ипотеч') && title.includes('калькулятор')) return true;
  if (title === 'ипотечный калькулятор') return true;
  if (desc.includes('рассчитаем ипотеку') || desc.includes('рассчитать ипотеку')) return true;
  if (item.icon === 'calculator' && (title.includes('ипотек') || link.includes('mortgage'))) return true;
  return false;
}

function coerceItem(raw: unknown, index: number): PlatformToolItem {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const action = typeof o.action === 'string' ? o.action : '';
  const link =
    (typeof o.link === 'string' && o.link.trim()) ||
    (typeof o.url === 'string' && o.url.trim()) ||
    ACTION_LINKS[action] ||
    '/catalog';
  return {
    id: typeof o.id === 'string' && o.id ? o.id : itemId(),
    icon: typeof o.icon === 'string' && o.icon ? o.icon : 'building2',
    title: String(o.title ?? ''),
    description: String(o.description ?? o.desc ?? o.button ?? ''),
    link,
    enabled: o.enabled !== false,
    order: typeof o.order === 'number' ? o.order : index,
  };
}

export const DEFAULT_PLATFORM_TOOLS_SETTINGS: PlatformToolsSettings = {
  title: 'Инструменты',
  items: [
    {
      id: 't1',
      icon: 'user-search',
      title: 'Индивидуальный подбор',
      description: 'Подберём под запрос',
      link: '/selection',
      enabled: true,
      order: 0,
    },
    {
      id: 't2',
      icon: 'building2',
      title: 'Вся недвижимость',
      description: 'Каталог объектов',
      link: '/catalog',
      enabled: true,
      order: 1,
    },
    {
      id: 't3',
      icon: 'user-circle',
      title: 'Личный кабинет',
      description: 'Избранное и заявки',
      link: '/login',
      enabled: true,
      order: 2,
    },
  ],
};

export function normalizePlatformToolsSettings(
  raw: Record<string, unknown> | undefined | null,
): PlatformToolsSettings {
  const base = { ...DEFAULT_PLATFORM_TOOLS_SETTINGS };
  if (!raw) return base;
  const items = (Array.isArray(raw.items) ? raw.items.map(coerceItem) : base.items)
    .filter((i) => !isMortgageCalculatorPlatformTool(i))
    .filter((i) => i.title.trim() || i.description.trim())
    .sort((a, b) => a.order - b.order);
  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : base.title,
    items,
  };
}

export function sortedEnabledTools(settings: PlatformToolsSettings): PlatformToolItem[] {
  return settings.items
    .filter((i) => i.enabled && i.title.trim() && !isMortgageCalculatorPlatformTool(i))
    .sort((a, b) => a.order - b.order);
}
