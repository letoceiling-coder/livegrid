export type HelpSelectionBackground = 'soft-blue' | 'muted' | 'white';

export type HelpSelectionSettings = {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  backgroundVariant: HelpSelectionBackground;
};

export const DEFAULT_HELP_SELECTION_SETTINGS: HelpSelectionSettings = {
  title: 'Поможем подобрать недвижимость',
  description: 'Подберём квартиры, дома и ЖК под ваш бюджет и задачи.',
  buttonText: 'Получить консультацию',
  buttonUrl: '#consult',
  backgroundVariant: 'soft-blue',
};

export function normalizeHelpSelectionSettings(
  raw: Record<string, unknown> | undefined | null,
): HelpSelectionSettings {
  const base = { ...DEFAULT_HELP_SELECTION_SETTINGS };
  if (!raw) return base;
  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : base.title,
    description:
      typeof raw.description === 'string' && raw.description.trim() ? raw.description : base.description,
    buttonText:
      typeof raw.buttonText === 'string' && raw.buttonText.trim()
        ? raw.buttonText
        : typeof raw.button === 'string' && raw.button.trim()
          ? raw.button
          : base.buttonText,
    buttonUrl:
      typeof raw.buttonUrl === 'string' && raw.buttonUrl.trim()
        ? raw.buttonUrl
        : typeof raw.buttonLink === 'string' && raw.buttonLink.trim()
          ? raw.buttonLink
          : base.buttonUrl,
    backgroundVariant:
      raw.backgroundVariant === 'muted' || raw.backgroundVariant === 'white' || raw.backgroundVariant === 'soft-blue'
        ? raw.backgroundVariant
        : base.backgroundVariant,
  };
}

export function helpSelectionPanelClass(variant: HelpSelectionBackground): string {
  if (variant === 'white') return 'border-border/80 bg-background';
  if (variant === 'muted') return 'border-border/70 bg-muted/50';
  return 'border-primary/15 bg-primary/[0.06]';
}

export function isHelpConsultUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u === '#consult' || u === 'consult:' || u === '/consult';
}
